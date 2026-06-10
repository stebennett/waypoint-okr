# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm run start        # Run production build
npm run lint         # ESLint check
npm test             # Run Vitest suite once
npm run test:watch   # Run Vitest in watch mode

# Database
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Prisma Studio GUI

# Docker
docker compose up -d  # Run full stack in Docker
```

Tests are written with Vitest (`*.test.ts` next to the code under test). API route
tests mock `@/lib/prisma` and `@/lib/jira`; the JIRA client tests mock global `fetch`.

## Architecture

**Waypoint** is a Next.js 15 App Router application with SQLite via Prisma ORM.

### Data Model

Six core Prisma models in `prisma/schema.prisma`:
- **Quarter** — time period (active/closed) that contains objectives
- **Team** — organizational group
- **Objective** — goal at company or team level; supports alignment via `parentId` (team → company)
- **KeyResult** — measurable outcome under an objective
- **CheckIn** — weekly progress (0–100) and confidence (0–100) update on a key result

A KeyResult may optionally store a `jiraJql` query. `POST /api/key-results/[id]/sync`
counts matching JIRA issues (total vs `statusCategory = Done`) via `lib/jira.ts` and
records the percentage as a new CheckIn (`checkedInBy: "JIRA Sync"`). Requires
`JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_API_TOKEN` env vars; sync is user-triggered only.
- **Tag** — color-coded label for objectives (via `ObjectiveTag` junction table)

### Page / Component Pattern

Pages in `app/` follow a consistent split:
- `page.tsx` — server component that fetches data directly via Prisma
- `Client.tsx` — client component that receives data as props and handles interactivity

API routes live under `app/api/` and follow REST conventions. Routes accept query params for filtering (e.g., `?quarterId=`, `?teamId=`, `?level=`).

### Key Utilities

`lib/prisma.ts` — Prisma singleton (required for Next.js hot reload compatibility)  
`lib/utils.ts` — Progress color/text helpers (Red 0–33%, Amber 34–66%, Green 67–100%) and date formatting

### CI

GitHub Actions runs lint, type-check, tests, and build on all PRs (`.github/workflows/ci.yml`). Do not merge if these fail.

### Docker

Multi-stage Dockerfile with Next.js standalone output. SQLite data is persisted in a named volume. `next.config.ts` sets `output: 'standalone'`.
