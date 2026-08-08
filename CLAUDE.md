# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend (Express API)
pnpm dev:server       # Start the Express API server (PORT, default 4000)
pnpm build            # Compile src/ to dist/ (tsc)

# Frontend (Vite)
pnpm dev:frontend     # cd frontend && pnpm dev
cd frontend && pnpm build   # Production build
cd frontend && pnpm lint    # ESLint

# Scraper (ts-node)
pnpm scrape:local     # Run scraper immediately, untracked (bypasses time/ScrapeRun check)
pnpm scrape:dry       # Dry run → scrape-dry-run.json, no DB writes
pnpm scrape           # Production entrypoint (src/index.ts) — only actually scrapes once a
                       # daily/weekly run is due for the current Paris date; see below

# Database
pnpm prisma:migrate   # Run pending migrations (prisma migrate dev)
pnpm prisma:generate  # Regenerate Prisma client after schema changes

# Debug / local
pnpm test:cookies     # Test forum cookie auth (src/tests/test-cookie.ts)
pnpm test:backup      # Log MemberBackup row count (src/tests/test-backup.ts)
pnpm backup:local     # Manually trigger a member backup snapshot
```

## Architecture

### Two separate apps, one repo

**Backend** (`src/`): Express API (`src/server.ts`) + scraper (`src/scraper.ts`, `src/forumApi.ts`) + cron entrypoint (`src/index.ts`), all TypeScript run via `ts-node`. Talks directly to Prisma/PostgreSQL through `src/db.ts`. Runs on Northflank: the API as a long-lived service, the scraper as an hourly cron Job.

**Frontend** (`frontend/`): a separate Vite + React + TypeScript SPA, routed client-side with React Router (not file-based routing — there's no `app/` or `pages/` directory). Deployed to Vercel as a static build (`frontend/vercel.json` has the SPA rewrite rule). Talks to the backend over plain `fetch` (`frontend/src/api.ts`), not through any server-side API routes.

Root and `frontend/` are two independent pnpm projects (separate `pnpm-workspace.yaml` + lockfile each), not a linked monorepo workspace.

### API layer (`src/server.ts`)

Plain Express, no framework routing conventions to follow — every route is defined directly in this one file.

Endpoints:
- `GET /auth/status` — protected; confirms the `auth_token` cookie is valid
- `POST /auth` — public; checks `password` against `AUTH_PASSWORD`, sets the `auth_token` cookie (value = `AUTH_SECRET`) on success
- `GET /groups` — public (all reads are public; only mutations require auth)
- `GET /groups/:id/members` — public, members of a group by Prisma `id` (not `forumId`)
- `GET /members` — public, all members with joined group info (`groupName`, `groupForumId`)
- `PATCH /members/:id/status` — protected; sets `manualStatus` to `"absent"`, `"toDelete"`, or `null`
- `PATCH /members/:id/last-change-at` — protected; manually overrides `lastChangeAt`, normalized to UTC midnight of the given date (same convention the scraper uses)

Auth is a single shared password → `AUTH_SECRET` value stored in an httpOnly, `Secure`, `SameSite=None` cookie (frontend and backend are on different domains). `requireAuth` middleware just compares the cookie to `AUTH_SECRET`.

### Database (Prisma + PostgreSQL)

Four models: `Group`, `Member`, `MemberBackup`, `ScrapeRun`.

`Member.forumId` is a global unique key — a member belongs to exactly one group at a time but can be moved. When the scraper finds a member in a different group, it updates `groupId` in place (no duplicate).

`lastChangeAt` is set to **UTC midnight of the UTC date** when `lastPoints` changes (not the actual timestamp). Used to detect members inactive for too long.

`manualStatus` values: `"absent"` (exempted from alerts), `"toDelete"` (flagged for removal). `"toDelete"` is auto-cleared if the member's points change.

`ScrapeRun` is keyed by `(kind, targetDate)` (`kind` = `"daily"` | `"weekly"`, `targetDate` = Paris calendar date) and tracks `status` (`"running"` | `"success"` | `"failed"`). `src/index.ts` uses it to decide whether a run is still due and to catch up on missed/delayed cron ticks.

### Scraper flow (`src/scraper.ts`)

1. Roster phase: for each group (3 concurrent), fetch all pages of forum members (Cheerio, 50/page), upsert in DB. Retried up to 5 rounds (only the still-failing groups each round) before being reported as failed.
2. Points phase: for every member in DB, fetch RPs + face claim and update. Same 5-round retry, but only the still-failing members are retried each round — this is what makes a run "complete" even if some profiles fail transiently.
3. After both phases: backup all members to `MemberBackup`, then delete any member whose `forumId` wasn't seen in this run. Skipped entirely if any group's roster never succeeded, to avoid deleting members of a group the scraper simply couldn't reach.
4. Safety guards: if 0 members found for a group that had members before → treat as failed, retry. If 0 forumIds seen total across every group → skip cleanup entirely.
5. `src/index.ts` wraps a full `syncAllGroups()` call in a `ScrapeRun` row; any group/member left failing after all retries triggers a Discord alert (`DISCORD_WEBHOOK_URL`) with the list of what couldn't be scraped. An uncaught crash also alerts. If the midnight run hasn't succeeded by 01:00 Paris, a separate heartbeat alert fires once before retrying, signaling the cron tick itself was missed.

### Forum API (`src/forumApi.ts`)

Rate-limited to 1 request per 1.5s. Uses `FORUM_SESSION_COOKIE` env var for auth. Member RPs are scraped from profile pages via `.hidden_fields #field_id-13 field div`; face claim via `#user_avatar .user_fc field div`. `rateLimitedGet` retries up to 3 times (backoff) on both 5xx responses and network-level errors (timeout, connection reset).

### Frontend structure (`frontend/src/`)

- `App.tsx` — routes: `/all-members`, `/groups/:forumId`, `/in-danger`, `/to-delete`, redirects `/` → `/all-members`
- `auth-context.tsx` — auth state (login/logout, checks `/auth/status` on mount so login survives a refresh)
- `theme-context.tsx` / `theme.ts` — light/dark MUI theme toggle
- `components/AllMembersPage.tsx` — all members across groups
- `components/GroupPage.tsx` — members of a single group
- `components/DangerPage.tsx` — members flagged as at risk (inactive), with a bulk "copy list" action
- `components/ToDeletePage.tsx` — members with `manualStatus = "toDelete"`, same bulk copy action
- `components/Sidebar.tsx` — navigation between groups and the special pages above
- `components/StatusMenu.tsx` / `StatusTag.tsx` / `GroupTag.tsx` — status/group badges, shared soft-tinted style (`helpers/badgeStyle.ts`), theme-aware (different tint direction in light vs dark)
- `components/MemberCard.tsx` — mobile card layout (DataGrid is desktop-only, gated by `hooks/useIsMobile.tsx`)
- `helpers/status.ts` — derives `ComputedStatus` (`actif`/`enDanger`/`absent`/`toDelete`) from `manualStatus` + `lastChangeAt` age

### Environment variables

```
DATABASE_URL              # PostgreSQL connection string
FORUM_BASE_URL            # Forum base URL (e.g. https://example.forumactif.com)
FORUM_SESSION_COOKIE      # Session cookie for authenticated scraping (local dev only —
                           # not needed where only public group pages are scraped)
DISCORD_WEBHOOK_URL       # Discord webhook for scrape-failure alerts (optional — logs a
                           # warning and skips the alert if unset)
AUTH_PASSWORD             # Shared login password checked by POST /auth
AUTH_SECRET               # Value stored in the auth_token cookie once logged in
PORT                      # Backend API port (default 4000)
FRONTEND_URL              # Allowed CORS origin for the deployed frontend (plus a regex
                           # allowlist for Vercel preview URLs, hardcoded in server.ts)
ENV                       # Set to "local" to force an untracked scrape (pnpm scrape:local)
```

Frontend-side (`frontend/`, Vite):

```
VITE_API_BASE             # Backend API base URL (default http://localhost:4000)
```

In the Northflank Job/service, these are set as Northflank secrets/env vars — `FORUM_SESSION_COOKIE` isn't needed there since CI/prod scraping only touches public group pages.
