# Slack Login — Design

Date: 2026-06-10
Status: Approved (autonomous goal session)

## Goal

Add "Sign in with Slack" authentication to Waypoint. When configured, every page
and API route requires a signed-in Slack user; when not configured, the app
behaves exactly as it does today (open access), mirroring the optional JIRA
integration pattern.

## Approach

Use **Auth.js (NextAuth v5) with the Slack OIDC provider** and JWT sessions.

Alternatives considered:
- *Hand-rolled Slack OpenID Connect flow* — more code and security surface for no benefit.
- *Hosted auth (Clerk, Auth0)* — external dependency; overkill for a self-hosted internal tool.

JWT sessions mean **no Prisma schema changes**: no User/Account/Session tables,
no adapter, and the middleware stays edge-compatible.

## Configuration

Auth is enabled only when all three env vars are present (Auth.js standard names):

| Variable | Purpose |
|----------|---------|
| `AUTH_SLACK_ID` | Slack app Client ID |
| `AUTH_SLACK_SECRET` | Slack app Client Secret |
| `AUTH_SECRET` | Session JWT signing secret |

`AUTH_URL` is optional (`trustHost: true` is set for Docker/proxy deployments).
If the vars are missing, `getAuthConfig()` returns `null` and the middleware
passes every request through — the same "configured or silently off" contract
as `getJiraConfig()` in `lib/jira.ts`. When auth is disabled the NextAuth
instance is created with a placeholder secret so module init never throws;
this is safe because in that state no route is protected anyway.

## Components

- `lib/auth-config.ts` — `getAuthConfig(env)` (all-or-nothing env validation,
  modeled on `getJiraConfig`) and `isPublicPath(pathname)` (public: `/login`,
  `/api/auth/*`, `/api/health`). Pure functions, unit tested.
- `auth.ts` (repo root) — NextAuth setup exporting `handlers`, `auth`,
  `signIn`, `signOut`. Slack provider only, `pages.signIn = '/login'`.
- `app/api/auth/[...nextauth]/route.ts` — re-exports `handlers`.
- `middleware.ts` — wraps the route matcher with `auth()`. Logic: auth not
  configured → pass; public path → pass; session present → pass; otherwise
  API routes get `401 { error: 'Unauthorized' }` and pages redirect to
  `/login?callbackUrl=<original>`. Matcher excludes `_next` static assets.
- `app/login/page.tsx` — server component. Redirects home if already signed
  in. Shows a "Sign in with Slack" button (server action calling
  `signIn('slack', { redirectTo: callbackUrl })`), or a "not configured"
  notice when auth is disabled.
- `app/actions/auth.ts` — `signOutAction` server action used by the Nav.
- `app/components/Nav.tsx` — gains an optional `user` prop (name) rendered
  with a Sign out button; `app/layout.tsx` fetches the session via `auth()`
  and passes `session.user` down.
- `app/api/health/route.ts` — public liveness endpoint; the Docker
  healthcheck moves here from `/api/quarters` (which now returns 401 when
  auth is on).

## Data flow

Browser → middleware (session cookie check via Auth.js JWT) → page/API.
Login: `/login` → Slack OIDC consent → `/api/auth/callback/slack` → JWT
session cookie → redirect to `callbackUrl`. Sign out clears the cookie and
redirects to `/login`.

## Error handling

- Partial configuration (some but not all AUTH vars) → auth stays disabled;
  README documents that all three are required.
- Unauthenticated API calls → 401 JSON (not a redirect), so fetch callers fail
  fast and the Docker healthcheck endpoint stays public.
- Slack requires HTTPS redirect URLs; local development needs a tunnel
  (e.g. ngrok) — documented in README, not worked around in code.

## Testing

Vitest, matching existing patterns (`vi.mock`, route-level tests):
- `lib/auth-config.test.ts` — env validation matrix, public path matching.
- `middleware.test.ts` — with `@/auth` mocked: disabled → pass-through;
  public path → pass; authed → pass; unauthed API → 401; unauthed page →
  redirect with `callbackUrl`.
- `app/api/health/route.test.ts` — returns 200 `{ status: 'ok' }`.

## Out of scope (YAGNI)

- Restricting sign-in to a specific Slack workspace (`team_id` claim check) —
  the Slack app itself is workspace-installed; revisit if needed.
- Persisting users in the database, roles/permissions, audit of `checkedInBy`.
