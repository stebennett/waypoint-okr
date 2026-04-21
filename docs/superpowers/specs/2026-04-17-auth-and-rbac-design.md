# Authentication & RBAC — Design

**Date:** 2026-04-17
**Status:** Approved (brainstorm)
**Scope:** Add login and role-based access control to Waypoint, including audit history for Objectives and Key Results.

---

## 1. Goals

Add self-contained login and a three-role access-control model to the current Waypoint OKR app. The app is self-hosted (Docker + SQLite) and must stay fully functional without external services. Slack login is a near-future requirement and must be scaffolded but inactive in v1.

### Roles

| Role | Capabilities |
|---|---|
| `viewer` | Read-only access to all dashboards, objectives, key results, check-ins, tags, history |
| `okr_manager` | Viewer + create/edit/delete objectives and key results + create/edit check-ins |
| `admin` | OKR manager + manage quarters, teams, tags + user management via `/admin` |

Roles are strictly hierarchical (higher inherits lower). `okr_manager` permissions are global in v1 — team-scoped permissions are deferred.

### Non-goals (v1)

- Email-based password reset / magic links (no SMTP dependency)
- Self-signup
- MFA
- Team-scoped OKR-manager permissions
- Audit history for quarters, teams, tags, users
- Slack login *activation* (scaffolded only — enable later via env vars)

---

## 2. Architecture

### Library

**Auth.js v5 (NextAuth v5)** with the Prisma adapter. Two providers configured from day one:

- **Credentials** (active): email + bcrypt-hashed password validated against the local `User` table.
- **Slack** (dormant): provider block is wrapped in `if (process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET)`. When the env vars are set in the future, the provider activates. The `signIn` callback additionally enforces "user must already exist" — i.e. Slack login only succeeds if the Slack profile's email matches an existing `User.email`. This preserves the invite-only policy.

### Session strategy

Database sessions via the Prisma adapter (not JWT). Rationale: role changes and user deletions take effect immediately, and SQLite is already present.

Cookie settings: `HttpOnly`, `Secure` (in production), `SameSite=Lax`.

### Password storage

bcrypt with cost factor 12. Plaintext passwords never persisted.

### Protection layers (defence in depth)

1. **`middleware.ts`** — redirects unauthenticated requests from non-public routes to `/login`; blocks `/admin/*` unless role is `admin`.
2. **API route handlers** — every mutating endpoint calls `await requireRole([...])` from `lib/auth/rbac.ts` before doing work. Returns `401` if unauthenticated, `403` if role insufficient.
3. **Server components / pages** — use `auth()` to render role-appropriate UI (e.g. hide Edit buttons for viewers). UI affordances are UX only; API checks are the real gate.

Public routes (no auth required): `/login`, `/api/auth/*`, static assets.

---

## 3. Data model

### New tables

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String?
  passwordHash String?   // null if user only has OAuth identity
  role         String    @default("viewer")   // viewer | okr_manager | admin
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  accounts            Account[]
  sessions            Session[]
  checkIns            CheckIn[]
  objectivesCreated   Objective[] @relation("ObjectiveCreatedBy")
  keyResultsCreated   KeyResult[] @relation("KeyResultCreatedBy")
  auditLogs           AuditLog[]
}

// Auth.js standard tables — exact shape per @auth/prisma-adapter docs
model Account { /* provider, providerAccountId, userId, ... */ }
model Session { /* sessionToken, userId, expires */ }
model VerificationToken { /* identifier, token, expires */ }

model AuditLog {
  id         String   @id @default(cuid())
  entityType String   // "Objective" | "KeyResult"
  entityId   String
  userId     String?
  action     String   // "create" | "update" | "delete"
  changes    String   // JSON string (see §4)
  createdAt  DateTime @default(now())
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([entityType, entityId])
  @@index([createdAt])
}
```

Notes:
- `role` is a string (SQLite has no enum); validated via TypeScript union `type Role = "viewer" | "okr_manager" | "admin"` and Zod at boundaries.
- `changes` is JSON-as-string; SQLite `json()` functions can query it if needed.

### Changes to existing tables

| Table | Change |
|---|---|
| `CheckIn` | Drop `checkedInBy` (string). Add `userId String?` → `User` (`onDelete: SetNull`). |
| `Objective` | Add `createdById String?` → `User` (`onDelete: SetNull`). |
| `KeyResult` | Add `createdById String?` → `User` (`onDelete: SetNull`). |

### Migration behaviour

Single Prisma migration named `add_auth_and_audit`. Existing `CheckIn` rows get `userId = NULL` (unattributed historical). The `checkedInBy` string column is dropped — very low existing volume; clean schema preferred. All new FKs nullable with `SetNull` on delete so user deletion preserves history.

---

## 4. RBAC enforcement

### Helper module `lib/auth/rbac.ts`

Exposes:

- `type Role = "viewer" | "okr_manager" | "admin"`
- `const ROLE_ORDER: Record<Role, number>` — for hierarchical comparisons
- `hasRole(session, minRole: Role): boolean`
- `async function requireRole(minRole: Role): Promise<Session>` — reads current session; throws `HttpError(401)` / `HttpError(403)` as appropriate

A tiny `withErrorHandling` wrapper in route handlers converts thrown `HttpError` to the correct JSON response.

### API permission map

| Endpoint | Minimum role |
|---|---|
| `GET /api/**` (all reads) | authenticated (any role) |
| `POST/PATCH/DELETE /api/objectives/**` | `okr_manager` |
| `POST/PATCH/DELETE /api/key-results/**` | `okr_manager` |
| `POST/PATCH /api/check-ins/**` | `okr_manager` |
| `POST/PATCH/DELETE /api/quarters/**` | `admin` |
| `POST/PATCH/DELETE /api/teams/**` | `admin` |
| `POST/PATCH/DELETE /api/tags/**` | `admin` |
| `/api/admin/users/**` | `admin` |
| `/api/account/password` | authenticated (self only) |
| `GET /api/objectives/[id]/history` | authenticated |

Every mutating endpoint uses `requireRole`. No ad-hoc checks.

---

## 5. Audit history

### Write path

`lib/audit.ts` exports `recordChange({ entityType, entityId, userId, action, before, after })`.

Tracked fields:
- **Objective:** `title`, `description`, `status`, `level`, `quarterId`, `teamId`, `parentId`, `closeNote`
- **KeyResult:** `title`, `description`, `finalScore`, `closeNote`

For `action: "update"`, `changes` is `{ [field]: { from, to } }` containing only fields that actually changed. If no tracked fields changed, no log row is written.

For `action: "create"` / `"delete"`, `changes` is a single snapshot object of the tracked fields.

Call sites:
- `POST /api/objectives`, `PATCH /api/objectives/[id]`, `DELETE /api/objectives/[id]`
- `POST /api/key-results/*`, `PATCH /api/key-results/[id]`, `DELETE /api/key-results/[id]`

Each call runs inside the same Prisma transaction as the mutation, so audit rows never drift from entity state.

### Read path

- `GET /api/objectives/[id]/history` → returns audit rows for the objective **plus** audit rows for every `KeyResult` whose `objectiveId = [id]`. Joined with `User` for `name`/`email`. Ordered by `createdAt desc`. If the user is deleted, `user` is `null` and UI renders "deleted user".
- UI: a **History** panel on the Objective detail page renders each entry as a one-line summary (e.g. *"Alex Chen changed title: 'Grow MAU' → 'Grow monthly active users' · 2 hours ago"*). For create/delete, renders a single summary line.

---

## 6. Admin UI (`/admin`)

All admin pages require `role === "admin"`. No link from the main navigation — the path is discoverable by URL only.

### Routes

| Path | Purpose |
|---|---|
| `/admin` | Landing: user count, role breakdown, link to user management |
| `/admin/users` | Table of users (email, name, role, created, last-login from `Session`). Row actions: Edit, Reset password, Delete |
| `/admin/users/new` | Form: email, name, role, initial password. Creates user with bcrypt hash. No email sent |
| `/admin/users/[id]/edit` | Form: name, role. Email is immutable — delete + recreate if needed |
| `/admin/users/[id]/reset-password` | Single field for new password; admin communicates it out of band |

### Safety rails

- An admin cannot demote or delete themselves (server-side check; UI disables the action too).
- At least one admin must exist at all times — the system rejects any change that would reduce `count(role='admin')` to 0.
- Deleting a user cascades `SetNull` on `CheckIn.userId`, `Objective.createdById`, `KeyResult.createdById`, `AuditLog.userId` — history preserved, attribution shows "deleted user".

### Bootstrap (first admin)

`scripts/bootstrap-admin.ts` runs inside `docker-entrypoint.sh` after `prisma migrate deploy`:

1. If the `User` table is empty, read `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` env vars.
2. Create a single admin user with bcrypt-hashed password.
3. If the table is non-empty, the script is a no-op.

Both env vars are documented in `README.md` and `docker-compose.yml`. `ADMIN_INITIAL_PASSWORD` carries a prominent warning to be changed on first login.

### Login & account pages

- **`/login`** — email + password form. Generic error on failure ("Invalid email or password") — no user enumeration. Honours `?callbackUrl`. **Slack sign-in button renders only when `SLACK_CLIENT_ID` is set.**
- **`/logout`** — clears session, redirects to `/login`.
- **`/account`** — self-service password change for any authenticated user: current password → new password → confirm. Enforces current-password verification server-side.

---

## 7. Environment & deployment

### New env vars

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_SECRET` | **Yes** | Auth.js signing secret (32+ bytes random) |
| `ADMIN_EMAIL` | Yes (first boot) | Bootstrap admin email |
| `ADMIN_INITIAL_PASSWORD` | Yes (first boot) | Bootstrap admin password |
| `NEXTAUTH_URL` / `AUTH_URL` | Production | Base URL for callbacks |
| `SLACK_CLIENT_ID` | No | Activates Slack provider when set |
| `SLACK_CLIENT_SECRET` | No | Required if `SLACK_CLIENT_ID` is set |

`docker-compose.yml` gains these with placeholders. README documents setup and warns that `ADMIN_INITIAL_PASSWORD` must be changed on first login.

### `docker-entrypoint.sh` updates

1. `prisma migrate deploy`
2. `node scripts/bootstrap-admin.js` (compiled from `.ts`)
3. Start the Next.js server

---

## 8. File layout

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── account/page.tsx
├── admin/
│   ├── layout.tsx                      # server-side admin check
│   ├── page.tsx
│   └── users/
│       ├── page.tsx
│       ├── new/page.tsx
│       └── [id]/
│           ├── edit/page.tsx
│           └── reset-password/page.tsx
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── admin/users/...
│   ├── account/password/route.ts
│   └── objectives/[id]/history/route.ts
lib/
├── auth/
│   ├── config.ts                       # Auth.js config (providers, adapter, callbacks)
│   ├── rbac.ts                         # requireRole, hasRole, Role type
│   └── session.ts                      # server helpers
├── audit.ts
└── prisma.ts                           # unchanged
middleware.ts                           # NEW: /admin gate + unauth redirect
prisma/
├── schema.prisma                       # updated
└── migrations/..._add_auth_and_audit/
scripts/bootstrap-admin.ts
docker-entrypoint.sh                    # updated
docker-compose.yml                      # updated
README.md                               # updated (env vars, bootstrap, roles)
TODOS.md                                # phase checklist per project convention
```

---

## 9. Testing approach

No test harness currently exists. In scope for this feature:

- **Manual smoke test per role** (viewer / okr_manager / admin) at the end of each phase.
- **Targeted API assertions** for `requireRole` on a handful of representative endpoints: unauthenticated → 401, wrong role → 403, correct role → 200.

Setting up a full test harness is explicitly **out of scope** — that's a separate, larger initiative.

---

## 10. Deferred / future work

- Slack login **activation** (wire env vars, test against a Slack workspace).
- Email-based password reset (requires SMTP).
- Self-signup (with or without domain allowlist).
- Team-scoped `okr_manager` permissions (add `UserTeam` table + scope-aware policy).
- Audit history for quarters/teams/tags/users.
- MFA.
- Full automated test harness.
