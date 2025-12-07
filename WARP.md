# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Tech stack overview

- **Backend**: Node.js + TypeScript, Prisma ORM with PostgreSQL, Express HTTP API, scraping HTML pages with Axios + Cheerio.
- **Frontend**: React + TypeScript, Vite, Material UI (MUI) + MUI X DataGrid, client-side routing with React Router.
- **Package manager**: `pnpm` (lockfiles at repo root and in `frontend/`).

## High-level architecture

### Data & scraping pipeline (backend)

End-to-end flow is:

1. **Forum scraping**
   - `src/forumApi.ts` defines a rate-limited Axios client (`getClient`, `rateLimitedGet`) against `FORUM_BASE_URL`.
   - `fetchGroupMembersFromForum(forumGroupId)` scrapes group member lists from the forum (paginated, 50 members/page) and returns `ForumMemberInfo[]` with `forumId`, `username`, `profileUrl`.
   - `fetchMemberRps(profileUrl)` and `src/profile-scraper.ts` parse member profile pages to extract RP/points using Cheerio.
2. **Persistence layer**
   - `src/db.ts` configures a Prisma client using `@prisma/adapter-pg` and `pg.Pool`, reading `DATABASE_URL`.
   - Prisma schema and migrations live under `prisma/` and are wired via `prisma.config.ts`.
3. **Synchronization logic**
   - `src/scraper.ts` is the main synchronization module.
     - `syncGroup(groupId, seenForumIds)`
       - Loads a `Group` from the DB (Prisma) by internal `id` and finds all forum members for `group.forumId` using `fetchGroupMembersFromForum`.
       - Ensures `forumId` is globally unique across groups: looks up any existing `Member` by `forumId`, creates if missing, or updates `username`, `profileUrl`, and `groupId` if the member moved to another group.
       - For each `Member` in the group, fetches current points via `fetchMemberRps`, updates `lastPoints`, `lastScanAt`, and conditionally `lastChangeAt` using `getUtcMidnightOfUtcDate` from `src/utils/formatDate.ts` when points change.
       - Tracks all seen `forumId`s in a shared `Set` passed from `syncAllGroups`.
     - `syncAllGroups()`
       - Loads all groups from the DB, runs `syncGroup` for them in limited concurrency batches (`concurrency = 3`).
       - If **no `forumId` is seen** for the entire run (likely cookie/auth issue), aborts cleanup to protect data.
       - If any (future) server-side errors are flagged via `hadServerError`, also aborts cleanup.
       - Before deleting anything, calls `backupMembers()` from `src/backup.ts` to snapshot all `Member` rows into `memberBackup`.
       - Performs a cleanup pass: for each `Member` in the DB whose `forumId` is not `1` and not present in `seenForumIds`, deletes that member as "no longer in any scraped group".
       - Members with `forumId === '1'` are treated specially and deleted outright during cleanup.
4. **Backups and manual scripts**
   - `src/backup.ts` and `src/local/manual-backup.ts` both create `memberBackup` records from current `member` rows, leaving `id`/`backupAt` to Prisma defaults.
   - `src/local/scrape-to-file.ts` runs the scraping logic in **read-only/dry-run mode**, building an in-memory representation of groups/members and writing the result to `scrape-dry-run.json` without mutating the DB.
   - `src/tests/test-cookie.ts`, `src/tests/test-groups.ts`, and `src/tests/test-backup.ts` are **ad hoc diagnostic scripts** run with `ts-node` to validate cookie/auth, forum group scraping, and backups.

### Nightly job entrypoint

- `src/index.ts` is the cron-friendly entrypoint for the scraping job.
  - Uses `luxon` to compute `DateTime.now().setZone('Europe/Paris')`.
  - Unless `ENV=local`, the script **only runs the scraping** when `now.hour === 0` (midnight in France); otherwise it logs a message and exits.
  - When allowed, it calls `syncAllGroups()` from `src/scraper.ts` and logs success/failure.

### HTTP API (backend)

- `src/server.ts` exposes a small Express API over the Prisma models:
  - `GET /groups` → `Group[]` (sorted by `name`), mapped to `{ id, forumId, name }` for the frontend.
  - `GET /groups/:id/members` → members of a given group, with fields: `id, forumId, username, lastPoints, lastScanAt, lastChangeAt, profileUrl, manualStatus`.
  - `PATCH /members/:id/status` → updates `manualStatus` for a member to `'absent'` or `null`.
  - `GET /members` → flattened list of all members with joined group info, matching the `MemberWithGroup` shape used by the frontend (`groupName`, `groupForumId`, etc.).
- The server listens on `PORT` (default `4000`) and is intended to be used by the Vite frontend.

### Frontend application

- `frontend/` is a Vite-powered React + TS SPA that consumes the backend API.
- **API client**
  - `frontend/src/api.ts` centralizes HTTP calls.
  - `API_BASE` is `import.meta.env.VITE_API_BASE ?? 'http://localhost:4000'`.
  - Functions mirror backend endpoints: `fetchGroups`, `fetchGroupMembers`, `fetchAllMembers`, and `updateMemberStatus` (PATCH `/members/:id/status`).
- **Domain types**
  - `frontend/src/types.ts` defines `Group`, `Member`, and `MemberWithGroup`, aligned with the JSON returned by the backend.
- **Main layout and routing**
  - `frontend/src/App.tsx`:
    - On mount, calls `fetchGroups()` and stores them in local state.
    - Wraps the app in a dark MUI theme and sets up an `AppBar` with a toggleable drawer menu.
    - Uses React Router to expose three main routes:
      - `/all-members` → aggregated view of all members.
      - `/groups/:forumId` → per-group detail view.
      - `/in-danger` → members whose status is considered "en danger" (at risk).
    - Renders a `Sidebar` component for navigation between groups and summary pages.
- **Key UI components and helpers**
  - `frontend/src/components/Sidebar.tsx` renders a MUI `Drawer` with navigation links to "Tous les membres", "Membres en danger", and each group, color-coded via `getGroupColor`.
  - `frontend/src/components/GroupPage.tsx` shows members for a single group in an MUI X `DataGrid`, including status, last RP date, last scan time, and an action column to toggle `manualStatus` via `updateMemberStatus`.
  - `frontend/src/components/AllMembersPage.tsx` aggregates all members across groups into a single `DataGrid`, computing status counts (actif·ve, absent·e, en danger) and exposing the same absence toggle.
  - `frontend/src/components/DangerPage.tsx` fetches members per group, filters those with a computed status of `enDanger`, and displays a simpler list view.
  - `frontend/src/helpers/status.ts` encapsulates the derived "status" logic used across pages:
    - If `manualStatus === 'absent'` → `'absent'`.
    - If `lastChangeAt` is missing or older than 21 days → `'enDanger'`.
    - Otherwise → `'actif'`.
  - `frontend/src/helpers/formatDate.ts` uses `luxon` to display dates in the `Europe/Paris` timezone.
  - `frontend/src/helpers/groupColors.ts` maps `Group.forumId` to a fixed color palette used consistently in the UI.

## Commands and workflows

All commands below assume you are in the repo root: `/Users/marinebarthelemy/Sites/points-watcher`.

### Dependency installation

- Install backend dependencies (root):
  - `pnpm install`
- Install frontend dependencies (inside `frontend/`):
  - `cd frontend && pnpm install`

### Backend: build, scraping job, and API server

Scripts are defined in the root `package.json` and run with `pnpm <script>` from the repo root.

- **TypeScript build (backend)**
  - `pnpm build`
  - Compiles `src/` to `dist/` using `tsconfig.json`.

- **Prisma / database**
  - Run migrations (requires `DATABASE_URL`):
    - `pnpm prisma:migrate`
  - Regenerate Prisma client after schema changes:
    - `pnpm prisma:generate`

- **Run the scraping job**
  - Production-like behavior (respects midnight-in-France guard):
    - `pnpm scrape`
    - Runs `ts-node src/index.ts`, which checks `Europe/Paris` time and only scrapes at midnight unless `ENV=local`.
  - Force a local run regardless of current hour (sets `ENV=local`):
    - `pnpm scrape:local`
  - Dry-run that scrapes and writes to `scrape-dry-run.json` without mutating the DB:
    - `pnpm scrape:dry`

- **Run the HTTP API server for the frontend**
  - Start Express server on `PORT` (defaults to `4000`):
    - `pnpm dev:server`

- **Manual backup**
  - Create a backup snapshot of current members into `memberBackup` via `src/local/manual-backup.ts`:
    - `pnpm backup:local`

### Backend: diagnostic scripts / tests

These are small TypeScript scripts invoked via `ts-node` and exposed as `package.json` scripts.

- **Test forum session cookie** (uses `FORUM_SESSION_COOKIE`):
  - `pnpm test:cookies`
  - Hits a forum page that requires authentication, prints status code and HTML size, and heuristically determines whether the cookie is valid.

- **Inspect existing backups** (reads from `memberBackup`):
  - `pnpm test:backup`
  - Logs the number of records in `memberBackup`.

If you need to run an individual diagnostic file directly, you can also invoke `ts-node` yourself, e.g.:

- `pnpm exec ts-node src/tests/test-groups.ts`

### Frontend: dev, build, and lint

From the repo root, there is a convenience script to run the Vite dev server inside `frontend/`:

- **Start frontend dev server (Vite)**
  - `pnpm dev:frontend`
  - Equivalent to `cd frontend && pnpm dev`.

From inside `frontend/`:

- **Dev server**
  - `pnpm dev`
- **Production build**
  - `pnpm build`
- **Lint**
  - `pnpm lint`

### Coordinated local development

A typical local setup is:

1. Ensure environment variables are set (e.g. via an `.env` file):
   - `DATABASE_URL` (PostgreSQL connection for Prisma).
   - `FORUM_BASE_URL` (base URL of the forum to scrape).
   - `FORUM_SESSION_COOKIE` (session cookie string used by the scraper and `test-cookie` script).
   - `PORT` (optional, for the backend API; defaults to `4000`).
   - `VITE_API_BASE` (optional, for the frontend; defaults to `http://localhost:4000`).
2. In one terminal, from the repo root: `pnpm dev:server` (backend API).
3. In another terminal, from the repo root: `pnpm dev:frontend` (frontend at the Vite dev URL).
4. Use the UI to browse groups, view members, mark members as absent, and verify that status/last change dates match what the scraper writes.
