# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Next.js dev server on :3000
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — Next lint
- `npm test` — run Vitest once (`vitest run`); single test: `npx vitest run path/to/file.test.ts -t "name"`
- `npm run db:migrate` — `prisma migrate dev` (SQLite at `DATABASE_URL`, defaults to `file:./dev.db`)
- `npm run db:studio` — Prisma Studio
- `npm run bootstrap:admin` — `scripts/bootstrap-admin.ts`, seeds first admin from `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD`
- `docker compose up -d` — production-style run; `docker-entrypoint.sh` applies migrations then starts Next

Required env: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, plus `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` on first boot. Optional Slack OAuth: `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` (invite-only — login only succeeds for users that already exist).

## Architecture

**Stack:** Next.js 15 App Router + TypeScript, Prisma + SQLite, NextAuth v5 beta, Tailwind, Vitest. Deployed via Docker (fully functional) or Cloudflare Pages (UI only — API routes need SQLite so they don't work on Pages).

**Auth & RBAC.** Central to the app. Three roles form a total order in `lib/auth/rbac.ts`: `viewer < okr_manager < admin`. All gates go through:

- `requireAuth()` / `requireRole(minRole)` — throw `HttpError(401|403)`
- `middleware.ts` — redirects unauthenticated users to `/login` and restricts `/admin/*` to admins; public paths are `/login`, `/api/auth`, `/api/health`
- API route handlers wrap with `withErrorHandling` from `lib/http.ts`, which converts `HttpError` into proper JSON responses. New API routes should follow this pattern rather than handling auth/errors ad hoc.
- Session/JWT is extended to carry `user.role` (see `lib/auth/config.ts` and `lib/auth/session.ts`); `app/api/auth/[...nextauth]` wires NextAuth with the Prisma adapter
- Admin guards must be written against TOCTOU (see commit `a2b5a6c` — the last-admin check runs inside the same transaction as the mutation)

**Data model (`prisma/schema.prisma`).** Domain: `Team`, `Quarter`, `Objective` (level = `company`|`team`, optional `parentId` for alignment to a company objective), `KeyResult`, `CheckIn` (progress + confidence), `Tag` via `ObjectiveTag` join. `AuditLog` captures every objective/KR change — writes go through `lib/audit.ts`, and objective detail pages render the history. `User`/`Account`/`Session`/`VerificationToken` are the NextAuth tables with a `role` column added to `User`.

**App layout.** `app/` is App Router. Top-level routes (`objectives`, `quarters`, `teams`, `tags`, `check-in`, `account`, `admin`, `login`) each own their pages and client components. API lives under `app/api/*` and is the only way the client touches the DB. `lib/prisma.ts` is the singleton client — import it, don't instantiate `PrismaClient` in routes.

**Tests.** Vitest unit tests colocated next to source (`lib/auth/rbac.test.ts`, `lib/audit.test.ts`). `lib/auth/__mocks__/` exists for stubbing the NextAuth session in tests.

## Project conventions

- `TODOS.md` tracks phased work. At the end of each development phase, verify sub-tasks are complete and mark them `[x]`.
- Keep `README.md` up to date when shipping user-visible changes (env vars, deploy steps, roles, data model).
- Progress colour bands are fixed project-wide: 0–33 red, 34–66 amber, 67–100 green.
