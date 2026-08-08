# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend (Next.js)
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production
pnpm lint             # ESLint

# Scraper (ts-node)
pnpm scrape:local     # Run scraper immediately (bypasses time check)
pnpm scrape:dry       # Dry run → scrape-dry-run.json, no DB writes
pnpm scrape           # Production mode (only runs at midnight or Sunday 20h Paris time)

# Database
pnpm prisma:migrate   # Run pending migrations
pnpm prisma:generate  # Regenerate Prisma client after schema changes

# Debug / local
pnpm test:cookies     # Test forum cookie auth
pnpm backup:local     # Manually trigger member backup
```

## Architecture

### Two separate apps, one repo

**Scraper** (`src/`): Node.js/TypeScript scripts run via GitHub Actions (`.github/workflows/cron.yml`). Runs every hour in CI; `src/index.ts` only actually scrapes once a "daily" (midnight Paris) or "weekly" (Sunday 20h Paris) run is due for the current Paris calendar date — tracked in the `ScrapeRun` table so a delayed/missed hourly tick is caught up on the next one instead of being silently skipped. Talks directly to Prisma/PostgreSQL.

**Frontend**: Next.js 15 App Router (`app/`). Shared client-side code lives at the root: `api.ts`, `types.ts`, `components/`, `hooks/`, `helpers/`. The `app/page.tsx` mounts a full BrowserRouter (React Router) inside Next.js — routing is handled entirely by React Router, not Next.js file routing.

The old Vite frontend (`frontend/`) and the old Express server (`src/server.ts`) are being replaced by the Next.js app and its API routes (`app/api/`).

### API layer

Next.js API routes (`app/api/`) call Prisma directly — they import from `../../src/db`. The old Express routes in `src/server.ts` are the reference implementation (same logic, same endpoints).

Endpoints:
- `GET /api/groups` — all groups
- `GET /api/groups/[id]/members` — members of a group (by Prisma id, not forumId)
- `GET /api/members` — all members with group info
- `PATCH /api/members/[id]/status` — set `manualStatus` to `"absent"`, `"toDelete"`, or `null`

### Database (Prisma + PostgreSQL)

Four models: `Group`, `Member`, `MemberBackup`, `ScrapeRun`.

`ScrapeRun` is keyed by `(kind, targetDate)` (`kind` = `"daily"` | `"weekly"`, `targetDate` = Paris calendar date) and tracks `status` (`"running"` | `"success"` | `"failed"`). `src/index.ts` uses it to decide whether a run is still due and to catch up on missed/delayed cron ticks.

`Member.forumId` is a global unique key — a member belongs to exactly one group at a time but can be moved. When the scraper finds a member in a different group, it updates `groupId` in place (no duplicate).

`lastChangeAt` is set to **UTC midnight of the UTC date** when `lastPoints` changes (not the actual timestamp). Used to detect members inactive for too long.

`manualStatus` values: `"absent"` (exempted from alerts), `"toDelete"` (flagged for removal). `"toDelete"` is auto-cleared if the member's points change.

### Scraper flow (`src/scraper.ts`)

1. Roster phase: for each group (3 concurrent), fetch all pages of forum members (Cheerio, 50/page), upsert in DB. Retried up to 5 rounds (only the still-failing groups each round) before being reported as failed.
2. Points phase: for every member in DB, fetch RPs + face claim and update. Same 5-round retry, but only the still-failing members are retried each round — this is what makes a run "complete" even if some profiles fail transiently.
3. After both phases: backup all members to `MemberBackup`, then delete any member whose `forumId` wasn't seen in this run. Skipped entirely if any group's roster never succeeded, to avoid deleting members of a group the scraper simply couldn't reach.
4. Safety guards: if 0 members found for a group that had members before → treat as failed, retry. If 0 forumIds seen total across every group → skip cleanup entirely.
5. `src/index.ts` wraps a full `syncAllGroups()` call in a `ScrapeRun` row; any group/member left failing after all retries triggers a Discord alert (`DISCORD_WEBHOOK_URL`) with the list of what couldn't be scraped. An uncaught crash also alerts. If the midnight run hasn't succeeded by 01:00 Paris, a separate heartbeat alert fires once before retrying, signaling the cron tick itself was missed.

### Forum API (`src/forumApi.ts`)

Rate-limited to 1 request per 1.5s. Uses `FORUM_SESSION_COOKIE` env var for auth. Member RPs are scraped from profile pages via `.hidden_fields #field_id-13 field div`. `rateLimitedGet` retries up to 3 times (backoff) on both 5xx responses and network-level errors (timeout, connection reset).

### UI views

- `AllMembersPage` — all members across groups
- `GroupPage` — members of a single group
- `DangerPage` — members flagged as at risk (inactive)
- `ToDeletePage` — members with `manualStatus = "toDelete"`
- `Sidebar` — navigation between groups and special pages

### Environment variables

```
DATABASE_URL              # PostgreSQL connection string
FORUM_BASE_URL            # Forum base URL (e.g. https://example.forumactif.com)
FORUM_SESSION_COOKIE      # Session cookie for authenticated scraping (local dev)
DISCORD_WEBHOOK_URL       # Discord webhook for scrape-failure alerts (optional — logs a warning and skips the alert if unset)
```

In GitHub Actions, `DATABASE_URL`, `FORUM_BASE_URL` and `DISCORD_WEBHOOK_URL` come from repository secrets. The session cookie is not needed in CI (public group pages only).
