# Points Watcher

A full-stack application for monitoring forum group members and tracking their activity points (RPs - Roleplay Points) over time. The system automatically scrapes member data from forum groups, detects changes, and provides a web interface for monitoring member activity.

## Features

- **Automated Scraping**: Hourly Northflank cron Job that syncs member data once a day (midnight Paris time) or once a week (Sunday 20h), with catch-up retry and Discord alerting on failure
- **Multi-Group Support**: Track members across multiple forum groups
- **Activity Tracking**: Monitor member points (RPs) and detect changes
- **Group Transfer Detection**: Automatically detect when members move between groups
- **Manual Status Management**: Mark members as "absent" or "to delete"
- **Data Backup**: Automatic backup of member data before updates
- **REST API**: Express server providing endpoints for group and member management
- **Modern Frontend**: React-based dashboard with Material-UI components
- **PostgreSQL Database**: Prisma ORM for type-safe database operations

## Tech Stack

### Backend

- **Node.js** with TypeScript
- **Express.js** for REST API
- **Prisma** ORM with PostgreSQL
- **Axios** for HTTP requests with cookie jar support
- **Cheerio** for HTML parsing
- **Luxon** for date/time handling

### Frontend

- **React 19** with TypeScript
- **Vite** for build tooling
- **Material-UI (MUI)** for UI components
- **React Router** for navigation
- **Tailwind CSS** for styling
- **MUI DataGrid** for data tables

## Project Structure

```
├── src/                      # Backend source code
│   ├── index.ts             # Main scraper entry point (cron job)
│   ├── server.ts            # Express API server
│   ├── scraper.ts           # Group and member sync logic
│   ├── forumApi.ts          # Forum API client with rate limiting
│   ├── backup.ts            # Member data backup
│   ├── db.ts                # Prisma client
│   ├── profile-scraper.ts   # Profile scraping utilities
│   ├── utils/               # Utility functions
│   ├── tests/               # Test scripts
│   └── local/               # Local development scripts
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── helpers/         # Helper functions
│   │   └── api.ts           # API client
│   └── public/
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma
│   └── migrations/
```

## Database Schema

### Models

- **Group**: Forum groups being monitored

  - `id`, `forumId`, `name`, `createdAt`, `updatedAt`

- **Member**: Forum members with activity tracking

  - `id`, `forumId`, `username`, `profileUrl`, `groupId`
  - `lastPoints`, `lastScanAt`, `lastChangeAt`, `faceClaim`
  - `manualStatus` (optional: "absent" or "toDelete")

- **MemberBackup**: Historical backups of member data

  - Stores snapshots before updates

- **ScrapeRun**: Tracks whether the daily/weekly scrape has already succeeded for a given Paris calendar date
  - `kind` ("daily" | "weekly"), `targetDate`, `status` ("running" | "success" | "failed")
  - Lets the hourly cron tick catch up a missed/delayed run instead of silently skipping it

## API Endpoints

All `GET` routes are public. Mutations require a valid `auth_token` cookie (see Auth below).

### Auth

- `POST /auth` - Log in with `{ password }`, sets the `auth_token` cookie
- `GET /auth/status` - Protected; confirms the current cookie is still valid

### Groups

- `GET /groups` - List all groups
- `GET /groups/:id/members` - Get members of a specific group (by Prisma `id`, not `forumId`)

### Members

- `GET /members` - List all members with group information
- `PATCH /members/:id/status` - Protected; update `manualStatus` ("absent" | "toDelete" | null)
- `PATCH /members/:id/last-change-at` - Protected; manually override `lastChangeAt`

## Setup

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://user:password@host:port/database
FORUM_BASE_URL=https://your-forum-url.com
FORUM_SESSION_COOKIE=your_session_cookie_here
PORT=4000
AUTH_PASSWORD=choose_a_login_password
AUTH_SECRET=choose_a_random_secret
FRONTEND_URL=http://localhost:5173
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...   # optional, alerts are skipped if unset
```

In `frontend/`, optionally set `VITE_API_BASE` (defaults to `http://localhost:4000`).

### Installation

```bash
# Install root dependencies
pnpm install

# Install frontend dependencies
cd frontend && pnpm install && cd ..

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate
```

## Development

### Backend

```bash
# Run the scraper once (local mode)
pnpm scrape:local

# Dry run (scrape to file without DB update)
pnpm scrape:dry

# Start the API server
pnpm dev:server

# Test scripts
pnpm test:cookies
pnpm test:backup

# Manual backup
pnpm backup:local
```

### Frontend

```bash
# Start development server
pnpm dev:frontend

# Build for production
cd frontend && pnpm build
```

## Deployment

The application uses a Northflank cron Job for automated scraping:

- **Schedule**: Runs hourly
- **Logic**: Only actually scrapes once the daily (midnight Paris) or weekly (Sunday 20h Paris) run is due for the current Paris date — tracked in the `ScrapeRun` table so a missed/delayed tick is caught up on the next one
- **Retry**: Failed groups/members are retried across several rounds within a run before being reported as failed
- **Alerting**: Posts to Discord (`DISCORD_WEBHOOK_URL`) if anything is still failing after retries, if the run crashes, or if the midnight run hasn't succeeded by 01:00 Paris

### Environment Variables Required (Northflank)

- `DATABASE_URL`: PostgreSQL connection string
- `FORUM_BASE_URL`: Base URL of the forum
- `DISCORD_WEBHOOK_URL`: Discord webhook for failure alerts (optional)

## Key Features Explained

### Rate Limiting

The forum API client implements automatic rate limiting with a minimum 1.5-second interval between requests to avoid overwhelming the forum server.

### Change Detection

The system tracks:

- Point changes (RPs)
- Last scan timestamp
- Last change timestamp (set to UTC midnight when points change)
- Automatically resets "toDelete" status when member becomes active again

### Backup System

Before each sync, member data is backed up to the `MemberBackup` table, preserving historical snapshots for auditing and recovery.

### Group Transfer Detection

The `forumId` serves as a unique identifier. When a member is found in a different group, the system automatically updates their `groupId` while preserving their history.

## Scripts Reference

| Command                | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `pnpm build`           | Compile TypeScript to JavaScript                    |
| `pnpm prisma:migrate`  | Run database migrations                             |
| `pnpm prisma:generate` | Generate Prisma client                              |
| `pnpm scrape`          | Run scraper (production mode - checks for midnight) |
| `pnpm scrape:local`    | Run scraper in local mode (bypasses time check)     |
| `pnpm scrape:dry`      | Dry run - scrapes to JSON file without DB updates   |
| `pnpm dev:server`      | Start Express API server                            |
| `pnpm dev:frontend`    | Start Vite dev server for frontend                  |
| `pnpm test:cookies`    | Test forum cookie authentication                    |
| `pnpm test:backup`     | Test backup functionality                           |
| `pnpm backup:local`    | Manually trigger member data backup                 |

## License

Private project
