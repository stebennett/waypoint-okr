# Auth & RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add login (credentials now, Slack later), role-based access control with three roles (viewer / okr_manager / admin), audit history for Objectives and Key Results, and an admin UI at `/admin`.

**Architecture:** Auth.js v5 with Prisma adapter + database sessions. Two providers — Credentials (active) and Slack (dormant until env vars set). RBAC enforced in `middleware.ts` (path-level) and via `requireRole()` in every mutating API handler (API-level). Audit log is a generic table written inside each mutation's Prisma transaction.

**Tech Stack:** Next.js 15 (App Router), Auth.js v5 (`next-auth@beta`, `@auth/prisma-adapter`), `bcryptjs`, Prisma + SQLite, TypeScript, Tailwind.

**Spec:** `docs/superpowers/specs/2026-04-17-auth-and-rbac-design.md`

**Manual test users (reuse across phases):**
- `admin@test.local` / `adminpass1` — role `admin`
- `manager@test.local` / `managerpass1` — role `okr_manager`
- `viewer@test.local` / `viewerpass1` — role `viewer`

---

## File structure

New files:

```
middleware.ts
lib/auth/config.ts            # Auth.js config, providers, callbacks
lib/auth/rbac.ts              # Role type, ROLE_ORDER, hasRole, requireRole, HttpError
lib/auth/session.ts           # getSession() server helper
lib/audit.ts                  # recordChange(), computeDiff()
lib/http.ts                   # withErrorHandling wrapper
app/api/auth/[...nextauth]/route.ts
app/api/admin/users/route.ts
app/api/admin/users/[id]/route.ts
app/api/admin/users/[id]/reset-password/route.ts
app/api/account/password/route.ts
app/api/objectives/[id]/history/route.ts
app/login/page.tsx
app/login/LoginForm.tsx       # client component
app/account/page.tsx
app/account/PasswordForm.tsx  # client component
app/admin/layout.tsx
app/admin/page.tsx
app/admin/users/page.tsx
app/admin/users/UsersTable.tsx
app/admin/users/new/page.tsx
app/admin/users/new/NewUserForm.tsx
app/admin/users/[id]/edit/page.tsx
app/admin/users/[id]/edit/EditUserForm.tsx
app/admin/users/[id]/reset-password/page.tsx
app/admin/users/[id]/reset-password/ResetForm.tsx
app/objectives/[id]/HistoryPanel.tsx
scripts/bootstrap-admin.ts
types/next-auth.d.ts          # module augmentation for Session.user.role
```

Modified files:

```
prisma/schema.prisma
app/api/check-ins/route.ts
app/api/objectives/route.ts
app/api/objectives/[id]/route.ts
app/api/key-results/[id]/route.ts
app/api/quarters/**           # every mutating handler
app/api/teams/**              # every mutating handler
app/api/tags/**               # every mutating handler
app/layout.tsx                # expose session / logout link in header
app/objectives/[id]/page.tsx  # mount HistoryPanel
docker-entrypoint.sh
docker-compose.yml
package.json
README.md
TODOS.md
```

---

## Phase 1: Dependencies and schema

### Task 1.1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Auth.js, Prisma adapter, bcrypt, zod**

Run:
```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs zod
npm install -D @types/bcryptjs tsx
```

- [ ] **Step 2: Verify versions**

Run: `npm ls next-auth @auth/prisma-adapter bcryptjs zod`
Expected: `next-auth@5.x.x-beta.xx`, `@auth/prisma-adapter@^1` or `^2`, `bcryptjs@^2`, `zod@^3`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add auth.js, prisma adapter, bcryptjs, zod"
```

### Task 1.2: Update Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add User, Account, Session, VerificationToken, AuditLog models and FK columns**

Replace the content of `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  passwordHash String?
  role         String   @default("viewer")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  accounts          Account[]
  sessions          Session[]
  checkIns          CheckIn[]
  objectivesCreated Objective[] @relation("ObjectiveCreatedBy")
  keyResultsCreated KeyResult[] @relation("KeyResultCreatedBy")
  auditLogs         AuditLog[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model AuditLog {
  id         String   @id @default(cuid())
  entityType String
  entityId   String
  userId     String?
  action     String
  changes    String
  createdAt  DateTime @default(now())
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([entityType, entityId])
  @@index([createdAt])
}

model Team {
  id         String      @id @default(cuid())
  name       String      @unique
  createdAt  DateTime    @default(now())
  objectives Objective[]
}

model Tag {
  id         String         @id @default(cuid())
  name       String         @unique
  color      String         @default("#6366f1")
  objectives ObjectiveTag[]
}

model ObjectiveTag {
  objectiveId String
  tagId       String
  objective   Objective @relation(fields: [objectiveId], references: [id], onDelete: Cascade)
  tag         Tag       @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([objectiveId, tagId])
}

model Quarter {
  id         String      @id @default(cuid())
  name       String      @unique
  startDate  DateTime
  endDate    DateTime
  status     String      @default("active")
  createdAt  DateTime    @default(now())
  objectives Objective[]
}

model Objective {
  id          String         @id @default(cuid())
  title       String
  description String?
  level       String         @default("team")
  status      String         @default("active")
  quarterId   String
  teamId      String?
  parentId    String?
  createdById String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  quarter     Quarter        @relation(fields: [quarterId], references: [id])
  team        Team?          @relation(fields: [teamId], references: [id])
  parent      Objective?     @relation("Alignment", fields: [parentId], references: [id])
  children    Objective[]    @relation("Alignment")
  keyResults  KeyResult[]
  tags        ObjectiveTag[]
  createdBy   User?          @relation("ObjectiveCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  closeNote   String?
  closedAt    DateTime?
}

model KeyResult {
  id          String    @id @default(cuid())
  title       String
  description String?
  objectiveId String
  createdById String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  objective   Objective @relation(fields: [objectiveId], references: [id], onDelete: Cascade)
  createdBy   User?     @relation("KeyResultCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  checkIns    CheckIn[]
  closeNote   String?
  finalScore  Int?
}

model CheckIn {
  id          String    @id @default(cuid())
  keyResultId String
  userId      String?
  progress    Int
  confidence  Int
  notes       String?
  createdAt   DateTime  @default(now())
  keyResult   KeyResult @relation(fields: [keyResultId], references: [id], onDelete: Cascade)
  user        User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

(Note the removal of `CheckIn.checkedInBy` and the new FK columns.)

- [ ] **Step 2: Create the migration**

Run: `npx prisma migrate dev --name add_auth_and_audit`
Expected: migration created under `prisma/migrations/`, Prisma client regenerated, no errors.

- [ ] **Step 3: Verify existing data survived**

Run: `sqlite3 prisma/dev.db ".schema CheckIn"` (or `npx prisma studio`)
Expected: `CheckIn` has `userId` column, does NOT have `checkedInBy`. Existing rows still present with `userId = NULL`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add user, audit log, and attribution columns"
```

### Task 1.3: TypeScript module augmentation for session

**Files:**
- Create: `types/next-auth.d.ts`
- Modify: `tsconfig.json`

- [ ] **Step 1: Add session role augmentation**

Create `types/next-auth.d.ts`:

```ts
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "viewer" | "okr_manager" | "admin"
    } & DefaultSession["user"]
  }

  interface User {
    role?: "viewer" | "okr_manager" | "admin"
  }
}
```

- [ ] **Step 2: Ensure tsconfig includes types directory**

Open `tsconfig.json`. Confirm that `"include"` covers `types/**/*.ts` (it typically does via `"**/*.ts"`). If not, add `"types/**/*.ts"` to `include`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (may show pre-existing errors unrelated to auth — note them but don't fix here).

- [ ] **Step 4: Commit**

```bash
git add types/next-auth.d.ts tsconfig.json
git commit -m "feat(types): augment NextAuth Session with id and role"
```

---

## Phase 2: Auth.js configuration & login

### Task 2.1: RBAC primitives (`lib/auth/rbac.ts`)

**Files:**
- Create: `lib/auth/rbac.ts`

- [ ] **Step 1: Create the module**

Create `lib/auth/rbac.ts`:

```ts
import { auth } from "@/lib/auth/config"

export type Role = "viewer" | "okr_manager" | "admin"

export const ROLE_ORDER: Record<Role, number> = {
  viewer: 0,
  okr_manager: 1,
  admin: 2,
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function hasRole(
  userRole: Role | undefined | null,
  minRole: Role
): boolean {
  if (!userRole) return false
  return ROLE_ORDER[userRole] >= ROLE_ORDER[minRole]
}

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) throw new HttpError(401, "Unauthorized")
  return session
}

export async function requireRole(minRole: Role) {
  const session = await requireAuth()
  if (!hasRole(session.user.role as Role, minRole)) {
    throw new HttpError(403, "Forbidden")
  }
  return session
}
```

- [ ] **Step 2: Commit (even though `auth` isn't wired yet — imported in next task)**

```bash
git add lib/auth/rbac.ts
git commit -m "feat(auth): add RBAC primitives (Role, requireRole, HttpError)"
```

### Task 2.2: HTTP helper (`lib/http.ts`)

**Files:**
- Create: `lib/http.ts`

- [ ] **Step 1: Create the error wrapper**

Create `lib/http.ts`:

```ts
import { NextResponse } from "next/server"
import { HttpError } from "@/lib/auth/rbac"

export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T) => {
    try {
      return await handler(...args)
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      console.error(err)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/http.ts
git commit -m "feat: add withErrorHandling wrapper for API routes"
```

### Task 2.3: Auth.js configuration (`lib/auth/config.ts`)

**Files:**
- Create: `lib/auth/config.ts`

- [ ] **Step 1: Write the config**

Create `lib/auth/config.ts`:

```ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Slack from "next-auth/providers/slack"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const providers = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw)
      if (!parsed.success) return null
      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      })
      if (!user?.passwordHash) return null
      const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
      if (!ok) return null
      return {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        role: user.role as "viewer" | "okr_manager" | "admin",
      }
    },
  }),
]

if (process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET) {
  providers.push(
    Slack({
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
    })
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      // Slack provider: only allow if a matching User record already exists (invite-only).
      if (account?.provider === "slack") {
        if (!user.email) return false
        const existing = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        })
        return !!existing
      }
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        ;(session.user as { role?: string }).role =
          (user as { role?: string }).role ?? "viewer"
      }
      return session
    },
  },
})
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/auth/config.ts
git commit -m "feat(auth): configure Auth.js with credentials + dormant Slack"
```

### Task 2.4: Auth route handler + `AUTH_SECRET`

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `.env` (local dev — DO NOT commit)

- [ ] **Step 1: Create the catch-all handler**

Create `app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth/config"
export const { GET, POST } = handlers
```

- [ ] **Step 2: Generate and set AUTH_SECRET locally**

Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Add two lines to `.env` (create if missing):

```
AUTH_SECRET=<paste the hex string above>
AUTH_URL=http://localhost:3000
```

Confirm `.env` is gitignored: `grep -c '^\.env$' .gitignore` should print `1`. If not, add `.env` to `.gitignore`.

- [ ] **Step 3: Smoke test the provider listing**

Run: `npm run dev` in one terminal. In another: `curl -s http://localhost:3000/api/auth/providers | jq`.
Expected: JSON with a `credentials` entry and NO `slack` entry (Slack env vars unset).

- [ ] **Step 4: Commit**

```bash
git add app/api/auth/[...nextauth]/route.ts .gitignore
git commit -m "feat(auth): mount Auth.js catch-all route"
```

### Task 2.5: Session helper (`lib/auth/session.ts`)

**Files:**
- Create: `lib/auth/session.ts`

- [ ] **Step 1: Thin wrapper**

Create `lib/auth/session.ts`:

```ts
import { auth } from "@/lib/auth/config"
export async function getSession() {
  return await auth()
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth/session.ts
git commit -m "feat(auth): add getSession server helper"
```

### Task 2.6: Login page

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/LoginForm.tsx`

- [ ] **Step 1: Create the server page**

Create `app/login/page.tsx`:

```tsx
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import LoginForm from "./LoginForm"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const session = await getSession()
  const params = await searchParams
  if (session?.user) redirect(params.callbackUrl ?? "/")

  const slackEnabled = !!process.env.SLACK_CLIENT_ID
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-semibold mb-4">Sign in to Waypoint</h1>
        <LoginForm
          callbackUrl={params.callbackUrl ?? "/"}
          error={params.error}
          slackEnabled={slackEnabled}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the client form**

Create `app/login/LoginForm.tsx`:

```tsx
"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginForm({
  callbackUrl,
  error,
  slackEnabled,
}: {
  callbackUrl: string
  error?: string
  slackEnabled: boolean
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [localError, setLocalError] = useState<string | null>(
    error ? "Invalid email or password" : null
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setLocalError(null)
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    })
    setPending(false)
    if (res?.error) {
      setLocalError("Invalid email or password")
    } else {
      window.location.href = res?.url ?? callbackUrl
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      {localError && <p className="text-red-600 text-sm">{localError}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-indigo-600 text-white rounded py-2 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {slackEnabled && (
        <button
          type="button"
          onClick={() => signIn("slack", { callbackUrl })}
          className="w-full border rounded py-2"
        >
          Continue with Slack
        </button>
      )}
    </form>
  )
}
```

- [ ] **Step 3: Next.js 15 note**

`searchParams` is awaited here because this project uses Next 15 async params (per commit `8ddb5db`). Confirm other new pages follow the same pattern.

- [ ] **Step 4: Commit**

```bash
git add app/login/
git commit -m "feat(auth): add /login page and form"
```

### Task 2.7: Middleware — auth gate and `/admin` gate

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Write middleware**

Create `middleware.ts`:

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"

const PUBLIC_PATHS = ["/login", "/api/auth"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next()
  }
  if (!req.auth?.user) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith("/admin")) {
    if ((req.auth.user as { role?: string }).role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Exclude static assets and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

- [ ] **Step 2: Create a test admin manually to smoke-test login**

Run (from project root):
```bash
npx tsx -e "
import { prisma } from './lib/prisma'
import bcrypt from 'bcryptjs'
;(async () => {
  await prisma.user.upsert({
    where: { email: 'admin@test.local' },
    update: {},
    create: {
      email: 'admin@test.local',
      name: 'Test Admin',
      role: 'admin',
      passwordHash: await bcrypt.hash('adminpass1', 12),
    },
  })
  console.log('admin created')
})()
"
```

- [ ] **Step 3: Smoke test**

Run: `npm run dev`. Visit `http://localhost:3000/` → should redirect to `/login`. Sign in as `admin@test.local / adminpass1` → should redirect to `/`. Visit `/admin` → should load (empty page for now; expect 404 or similar since page doesn't exist — that's OK as long as middleware allows the admin through).

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): add middleware for auth gate and /admin guard"
```

### Task 2.8: Logout link in layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Read current layout**

Run: `cat app/layout.tsx` — understand its structure.

- [ ] **Step 2: Add a compact header with user email + sign-out**

In `app/layout.tsx`, add to the server component:

```tsx
import { getSession } from "@/lib/auth/session"
import { signOut } from "@/lib/auth/config"
```

Then render (near the top of the layout body, above `{children}`):

```tsx
{session?.user && (
  <header className="flex items-center justify-between px-6 py-2 border-b bg-gray-50">
    <span className="text-sm text-gray-600">
      Signed in as <strong>{session.user.email}</strong> ({(session.user as { role?: string }).role})
    </span>
    <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
      <button className="text-sm text-indigo-600 hover:underline">Sign out</button>
    </form>
  </header>
)}
```

Get `session` via `const session = await getSession()` inside the default export.

- [ ] **Step 3: Smoke test**

Restart dev server. Log in. Verify header shows email + role. Click "Sign out" → redirected to `/login`.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(ui): add session header with sign-out action"
```

---

## Phase 3: RBAC enforcement across the API

### Task 3.1: Protect check-ins API + migrate `checkedInBy` → `userId`

**Files:**
- Modify: `app/api/check-ins/route.ts`

- [ ] **Step 1: Replace file content**

Replace `app/api/check-ins/route.ts` with:

```ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const GET = withErrorHandling(async (request: Request) => {
  await requireAuth()
  const { searchParams } = new URL(request.url)
  const keyResultId = searchParams.get("keyResultId")
  const where = keyResultId ? { keyResultId } : {}
  const checkIns = await prisma.checkIn.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      keyResult: { select: { title: true, objectiveId: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  })
  return NextResponse.json(checkIns)
})

export const POST = withErrorHandling(async (request: Request) => {
  const session = await requireRole("okr_manager")
  const userId = session.user.id
  const body = await request.json()

  if (body.checkIns && Array.isArray(body.checkIns)) {
    const created = await prisma.$transaction(
      body.checkIns.map(
        (ci: { keyResultId: string; progress: number; confidence: number; notes?: string }) =>
          prisma.checkIn.create({
            data: {
              keyResultId: ci.keyResultId,
              progress: Math.min(100, Math.max(0, Number(ci.progress))),
              confidence: Math.min(100, Math.max(0, Number(ci.confidence))),
              notes: ci.notes?.trim() || null,
              userId,
            },
          })
      )
    )
    return NextResponse.json(created, { status: 201 })
  }

  if (!body.keyResultId) {
    return NextResponse.json({ error: "keyResultId is required" }, { status: 400 })
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      keyResultId: body.keyResultId,
      progress: Math.min(100, Math.max(0, Number(body.progress || 0))),
      confidence: Math.min(100, Math.max(0, Number(body.confidence || 0))),
      notes: body.notes?.trim() || null,
      userId,
    },
  })
  return NextResponse.json(checkIn, { status: 201 })
})
```

- [ ] **Step 2: Fix UI callers that sent `checkedInBy`**

Run: `grep -rn "checkedInBy" app/ --include='*.tsx' --include='*.ts'`
Expected: hits in `app/check-in/` and possibly other components passing a free-text name.

For each hit: remove the `checkedInBy` field from the POST body. The server now uses the session's `userId`. Delete any form fields that collect a "name" for the check-in.

- [ ] **Step 3: Smoke test**

Log in as `manager@test.local` (create via the same upsert snippet from Task 2.7, role `okr_manager`). Create a check-in through the UI. Verify it persists and `user` relation is populated.

- [ ] **Step 4: Commit**

```bash
git add app/api/check-ins/route.ts app/check-in/
git commit -m "feat(api): protect check-ins and attribute to session user"
```

### Task 3.2: Protect objectives API (+ capture `createdById`)

**Files:**
- Modify: `app/api/objectives/route.ts`
- Modify: `app/api/objectives/[id]/route.ts`

- [ ] **Step 1: Read current files**

Run: `cat app/api/objectives/route.ts app/api/objectives/[id]/route.ts`

- [ ] **Step 2: Wrap each handler**

Apply this pattern to every handler:

```ts
import { requireAuth, requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

// Reads:
export const GET = withErrorHandling(async (...args) => {
  await requireAuth()
  // ... existing logic
})

// Mutations:
export const POST = withErrorHandling(async (request: Request) => {
  const session = await requireRole("okr_manager")
  const body = await request.json()
  // ... existing logic, adding createdById: session.user.id when creating
})

export const PATCH = withErrorHandling(async (...args) => {
  await requireRole("okr_manager")
  // ... existing logic (do NOT touch createdById on update)
})

export const DELETE = withErrorHandling(async (...args) => {
  await requireRole("okr_manager")
  // ... existing logic
})
```

When creating the Objective, include `createdById: session.user.id` in `data`.

- [ ] **Step 3: Smoke test**

As `viewer@test.local` (create via upsert snippet, role `viewer`): creating an objective should return **403**. As `manager@test.local`: should succeed, and the row should have `createdById` populated.

- [ ] **Step 4: Commit**

```bash
git add app/api/objectives/
git commit -m "feat(api): protect objectives endpoints and capture createdById"
```

### Task 3.3: Protect key-results API (+ `createdById`)

**Files:**
- Modify: `app/api/key-results/[id]/route.ts` (and any sibling route files — `ls app/api/key-results/[id]`)

- [ ] **Step 1: List and read**

Run: `ls app/api/key-results/\[id\]/; cat app/api/key-results/\[id\]/route.ts`

- [ ] **Step 2: Apply the same wrapping pattern as Task 3.2**

Every handler: reads → `await requireAuth()`; mutations → `await requireRole("okr_manager")`. For create, include `createdById: session.user.id`.

- [ ] **Step 3: Smoke test**

As viewer: POST a key result → 403. As manager: → 201 and `createdById` populated.

- [ ] **Step 4: Commit**

```bash
git add app/api/key-results/
git commit -m "feat(api): protect key-results endpoints and capture createdById"
```

### Task 3.4: Protect quarters, teams, tags (admin-only mutations)

**Files:**
- Modify: all files under `app/api/quarters/`, `app/api/teams/`, `app/api/tags/`

- [ ] **Step 1: List every route file**

Run: `find app/api/quarters app/api/teams app/api/tags -name route.ts`

- [ ] **Step 2: For each, apply the pattern**

- `GET` → `await requireAuth()`
- `POST` / `PATCH` / `PUT` / `DELETE` → `await requireRole("admin")`
- Wrap every handler with `withErrorHandling`.

- [ ] **Step 3: Smoke test**

As `manager@test.local`: POST `/api/tags` → 403. As `admin@test.local`: → 201.

- [ ] **Step 4: Commit**

```bash
git add app/api/quarters/ app/api/teams/ app/api/tags/
git commit -m "feat(api): require admin role for quarters, teams, tags mutations"
```

### Task 3.5: Hide admin-only mutation UI from non-admins

**Files:**
- Modify: `app/quarters/`, `app/teams/`, `app/tags/` pages (and any client components with Create/Edit/Delete buttons)
- Modify: objective/key-result edit affordances for viewers

- [ ] **Step 1: Identify affordances**

Run: `grep -rln "Delete\|Create\|New\|Edit" app/quarters app/teams app/tags app/objectives 2>/dev/null`

- [ ] **Step 2: Gate each page/component**

In each page (server component), load `const session = await getSession()` and pass `role` to client components. Client components conditionally render buttons:

```tsx
{role === "admin" && <button>Create quarter</button>}
```

For objective/KR edit buttons:

```tsx
{(role === "okr_manager" || role === "admin") && <button>Edit</button>}
```

This is UX only — API checks are the real gate.

- [ ] **Step 3: Smoke test**

Sign in as viewer: the Quarters page loads but shows no Create/Edit/Delete buttons. Objective detail page shows no Edit. Sign in as manager: Edit visible, admin-only buttons hidden. Sign in as admin: all visible.

- [ ] **Step 4: Commit**

```bash
git add app/
git commit -m "feat(ui): hide mutation affordances based on role"
```

---

## Phase 4: Audit history

### Task 4.1: Audit helper (`lib/audit.ts`)

**Files:**
- Create: `lib/audit.ts`

- [ ] **Step 1: Create the module**

Create `lib/audit.ts`:

```ts
import type { Prisma, PrismaClient } from "@prisma/client"

type EntityType = "Objective" | "KeyResult"
type Action = "create" | "update" | "delete"

type PrismaTx = Prisma.TransactionClient | PrismaClient

export const TRACKED_FIELDS: Record<EntityType, string[]> = {
  Objective: [
    "title",
    "description",
    "status",
    "level",
    "quarterId",
    "teamId",
    "parentId",
    "closeNote",
  ],
  KeyResult: ["title", "description", "finalScore", "closeNote"],
}

function pick(obj: Record<string, unknown> | null, fields: string[]) {
  if (!obj) return {}
  const out: Record<string, unknown> = {}
  for (const f of fields) out[f] = obj[f] ?? null
  return out
}

export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {}
  for (const f of fields) {
    const a = before[f] ?? null
    const b = after[f] ?? null
    if (a !== b) diff[f] = { from: a, to: b }
  }
  return diff
}

export async function recordChange(
  tx: PrismaTx,
  args: {
    entityType: EntityType
    entityId: string
    userId: string | null
    action: Action
    before?: Record<string, unknown> | null
    after?: Record<string, unknown> | null
  }
) {
  const fields = TRACKED_FIELDS[args.entityType]
  let changes: unknown
  if (args.action === "update") {
    const diff = computeDiff(
      pick(args.before ?? null, fields),
      pick(args.after ?? null, fields),
      fields
    )
    if (Object.keys(diff).length === 0) return // no-op
    changes = diff
  } else if (args.action === "create") {
    changes = pick(args.after ?? null, fields)
  } else {
    changes = pick(args.before ?? null, fields)
  }
  await tx.auditLog.create({
    data: {
      entityType: args.entityType,
      entityId: args.entityId,
      userId: args.userId,
      action: args.action,
      changes: JSON.stringify(changes),
    },
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to `lib/audit.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/audit.ts
git commit -m "feat(audit): add recordChange helper with field diffing"
```

### Task 4.2: Wire audit into objectives CRUD

**Files:**
- Modify: `app/api/objectives/route.ts`
- Modify: `app/api/objectives/[id]/route.ts`

- [ ] **Step 1: Wrap each mutation in a transaction and call recordChange**

Pattern for `POST` (create):

```ts
const created = await prisma.$transaction(async (tx) => {
  const obj = await tx.objective.create({ data: {...} })
  await recordChange(tx, {
    entityType: "Objective",
    entityId: obj.id,
    userId: session.user.id,
    action: "create",
    after: obj as unknown as Record<string, unknown>,
  })
  return obj
})
```

Pattern for `PATCH` (update):

```ts
const updated = await prisma.$transaction(async (tx) => {
  const before = await tx.objective.findUniqueOrThrow({ where: { id } })
  const after = await tx.objective.update({ where: { id }, data: {...} })
  await recordChange(tx, {
    entityType: "Objective",
    entityId: id,
    userId: session.user.id,
    action: "update",
    before: before as unknown as Record<string, unknown>,
    after: after as unknown as Record<string, unknown>,
  })
  return after
})
```

Pattern for `DELETE`:

```ts
await prisma.$transaction(async (tx) => {
  const before = await tx.objective.findUniqueOrThrow({ where: { id } })
  await tx.objective.delete({ where: { id } })
  await recordChange(tx, {
    entityType: "Objective",
    entityId: id,
    userId: session.user.id,
    action: "delete",
    before: before as unknown as Record<string, unknown>,
  })
})
```

Import at top: `import { recordChange } from "@/lib/audit"`.

- [ ] **Step 2: Smoke test**

As manager: create objective → check `AuditLog` rows (`npx prisma studio` or `sqlite3 prisma/dev.db "SELECT * FROM AuditLog"`): one `create` row. Update title → one `update` row with `{"title":{"from":"...","to":"..."}}`. Delete → one `delete` row.

- [ ] **Step 3: Commit**

```bash
git add app/api/objectives/
git commit -m "feat(audit): record create/update/delete for objectives"
```

### Task 4.3: Wire audit into key-results CRUD

**Files:**
- Modify: all mutating handlers under `app/api/key-results/`

- [ ] **Step 1: Apply the same transaction pattern as Task 4.2**

Use `entityType: "KeyResult"`.

- [ ] **Step 2: Smoke test**

Update a KR title → `AuditLog` gets one row with `entityType="KeyResult"`, diff on `title`.

- [ ] **Step 3: Commit**

```bash
git add app/api/key-results/
git commit -m "feat(audit): record create/update/delete for key results"
```

### Task 4.4: History API endpoint

**Files:**
- Create: `app/api/objectives/[id]/history/route.ts`

- [ ] **Step 1: Create the handler**

```ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireAuth()
    const { id } = await ctx.params
    const krIds = (
      await prisma.keyResult.findMany({ where: { objectiveId: id }, select: { id: true } })
    ).map((k) => k.id)

    const rows = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "Objective", entityId: id },
          { entityType: "KeyResult", entityId: { in: krIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        entityType: r.entityType,
        entityId: r.entityId,
        action: r.action,
        changes: JSON.parse(r.changes),
        createdAt: r.createdAt,
        user: r.user,
      }))
    )
  }
)
```

- [ ] **Step 2: Smoke test**

Run: `curl -s http://localhost:3000/api/objectives/<existing-id>/history -H "Cookie: <session cookie from browser>"`
Expected: JSON array with the create/update rows from the previous tasks.

- [ ] **Step 3: Commit**

```bash
git add app/api/objectives/\[id\]/history/
git commit -m "feat(api): add objective history endpoint"
```

### Task 4.5: History UI panel

**Files:**
- Create: `app/objectives/[id]/HistoryPanel.tsx`
- Modify: `app/objectives/[id]/page.tsx`

- [ ] **Step 1: Client component**

Create `app/objectives/[id]/HistoryPanel.tsx`:

```tsx
"use client"
import { useEffect, useState } from "react"

type Entry = {
  id: string
  entityType: "Objective" | "KeyResult"
  entityId: string
  action: "create" | "update" | "delete"
  changes: Record<string, { from: unknown; to: unknown }> | Record<string, unknown>
  createdAt: string
  user: { id: string; name: string | null; email: string } | null
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "string") return `"${v}"`
  return String(v)
}

function renderEntry(e: Entry): string {
  const who = e.user?.name ?? e.user?.email ?? "deleted user"
  const what = e.entityType === "Objective" ? "objective" : "key result"
  if (e.action === "create") return `${who} created this ${what}`
  if (e.action === "delete") return `${who} deleted this ${what}`
  const diff = e.changes as Record<string, { from: unknown; to: unknown }>
  const parts = Object.entries(diff).map(
    ([field, { from, to }]) => `${field}: ${formatValue(from)} → ${formatValue(to)}`
  )
  return `${who} changed ${parts.join(", ")}`
}

export default function HistoryPanel({ objectiveId }: { objectiveId: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/objectives/${objectiveId}/history`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setEntries)
      .catch((e) => setError(String(e)))
  }, [objectiveId])

  if (error) return <p className="text-red-600 text-sm">Failed to load history: {error}</p>
  if (!entries) return <p className="text-gray-500 text-sm">Loading history…</p>
  if (entries.length === 0) return <p className="text-gray-500 text-sm">No changes yet.</p>

  return (
    <ul className="space-y-2 text-sm">
      {entries.map((e) => (
        <li key={e.id} className="border-l-2 border-gray-200 pl-3">
          <div>{renderEntry(e)}</div>
          <div className="text-xs text-gray-500">
            {new Date(e.createdAt).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Mount on objective detail page**

Open `app/objectives/[id]/page.tsx`. At a sensible position (below KRs), add:

```tsx
import HistoryPanel from "./HistoryPanel"
// ...
<section className="mt-8">
  <h2 className="text-lg font-semibold mb-2">History</h2>
  <HistoryPanel objectiveId={id} />
</section>
```

(`id` should already be the awaited param from this file; if not, read the existing code and reuse the same variable.)

- [ ] **Step 3: Smoke test**

Open an objective in the browser. Confirm history panel renders entries. Make another change → refresh → new entry appears.

- [ ] **Step 4: Commit**

```bash
git add app/objectives/\[id\]/
git commit -m "feat(ui): add history panel to objective detail page"
```

---

## Phase 5: Admin UI

### Task 5.1: Admin layout + landing page

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Admin layout (defence in depth, alongside middleware)**

Create `app/admin/layout.tsx`:

```tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/auth/session"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if ((session?.user as { role?: string })?.role !== "admin") redirect("/")

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <nav className="mb-6 flex gap-4 text-sm">
        <Link href="/admin" className="text-indigo-600 hover:underline">Overview</Link>
        <Link href="/admin/users" className="text-indigo-600 hover:underline">Users</Link>
      </nav>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Admin landing**

Create `app/admin/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma"

export default async function AdminHome() {
  const [total, byRole] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ])
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Admin</h1>
      <p className="mb-2">Total users: {total}</p>
      <ul className="text-sm">
        {byRole.map((r) => (
          <li key={r.role}>{r.role}: {r._count._all}</li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Smoke test**

As admin: `/admin` shows counts. As viewer: redirects to `/`. As manager: redirects to `/`. (Note middleware *also* prevents them; if middleware already redirects, you'll only see the layout check if middleware is misconfigured.)

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx app/admin/page.tsx
git commit -m "feat(admin): add /admin layout and overview page"
```

### Task 5.2: Users list page

**Files:**
- Create: `app/admin/users/page.tsx`
- Create: `app/admin/users/UsersTable.tsx`

- [ ] **Step 1: Server page**

Create `app/admin/users/page.tsx`:

```tsx
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import UsersTable from "./UsersTable"

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sessions: {
        orderBy: { expires: "desc" },
        take: 1,
        select: { expires: true },
      },
    },
  })
  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    lastSessionExpires: u.sessions[0]?.expires.toISOString() ?? null,
  }))
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Link href="/admin/users/new" className="bg-indigo-600 text-white px-3 py-1 rounded">New user</Link>
      </div>
      <UsersTable rows={rows} />
    </div>
  )
}
```

- [ ] **Step 2: Client table**

Create `app/admin/users/UsersTable.tsx`:

```tsx
"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"

type Row = {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  lastSessionExpires: string | null
}

export default function UsersTable({ rows }: { rows: Row[] }) {
  const router = useRouter()

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Delete user ${email}? History will be preserved.`)) return
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    if (res.ok) router.refresh()
    else alert((await res.json()).error ?? "Delete failed")
  }

  return (
    <table className="w-full text-sm border">
      <thead className="bg-gray-50">
        <tr>
          <th className="text-left p-2">Email</th>
          <th className="text-left p-2">Name</th>
          <th className="text-left p-2">Role</th>
          <th className="text-left p-2">Created</th>
          <th className="text-left p-2">Last seen</th>
          <th className="p-2"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t">
            <td className="p-2">{r.email}</td>
            <td className="p-2">{r.name ?? "—"}</td>
            <td className="p-2">{r.role}</td>
            <td className="p-2">{new Date(r.createdAt).toLocaleDateString()}</td>
            <td className="p-2">
              {r.lastSessionExpires ? new Date(r.lastSessionExpires).toLocaleDateString() : "—"}
            </td>
            <td className="p-2 text-right space-x-2">
              <Link href={`/admin/users/${r.id}/edit`} className="text-indigo-600">Edit</Link>
              <Link href={`/admin/users/${r.id}/reset-password`} className="text-indigo-600">Reset</Link>
              <button onClick={() => handleDelete(r.id, r.email)} className="text-red-600">Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/users/page.tsx app/admin/users/UsersTable.tsx
git commit -m "feat(admin): add users list page"
```

### Task 5.3: Users API — list, create, update, delete

**Files:**
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/users/[id]/route.ts`

- [ ] **Step 1: Validation schemas + create**

Create `app/api/admin/users/route.ts`:

```ts
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole, HttpError } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(8).max(200),
  role: z.enum(["viewer", "okr_manager", "admin"]),
})

export const GET = withErrorHandling(async () => {
  await requireRole("admin")
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })
  return NextResponse.json(users)
})

export const POST = withErrorHandling(async (req: Request) => {
  await requireRole("admin")
  const body = createSchema.parse(await req.json())
  const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } })
  if (existing) throw new HttpError(409, "A user with that email already exists")
  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase(),
      name: body.name ?? null,
      role: body.role,
      passwordHash: await bcrypt.hash(body.password, 12),
    },
    select: { id: true, email: true, name: true, role: true },
  })
  return NextResponse.json(user, { status: 201 })
})
```

- [ ] **Step 2: Update + delete**

Create `app/api/admin/users/[id]/route.ts`:

```ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole, HttpError } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

const updateSchema = z.object({
  name: z.string().min(1).max(120).nullable().optional(),
  role: z.enum(["viewer", "okr_manager", "admin"]).optional(),
})

async function assertNotLastAdminChange(targetId: string, newRole?: string) {
  if (newRole === "admin") return
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } })
  if (!target || target.role !== "admin") return
  const adminCount = await prisma.user.count({ where: { role: "admin" } })
  if (adminCount <= 1) {
    throw new HttpError(400, "Cannot remove or demote the last admin")
  }
}

export const PATCH = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireRole("admin")
    const { id } = await ctx.params
    const body = updateSchema.parse(await req.json())

    if (session.user.id === id && body.role && body.role !== "admin") {
      throw new HttpError(400, "You cannot demote yourself")
    }
    if (body.role) await assertNotLastAdminChange(id, body.role)

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.role ? { role: body.role } : {}),
      },
      select: { id: true, email: true, name: true, role: true },
    })
    return NextResponse.json(updated)
  }
)

export const DELETE = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireRole("admin")
    const { id } = await ctx.params
    if (session.user.id === id) throw new HttpError(400, "You cannot delete yourself")
    await assertNotLastAdminChange(id)
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }
)
```

- [ ] **Step 3: Smoke test**

As admin, from the users list: try to delete yourself → "You cannot delete yourself". Create a second admin, then demote the first → succeeds. Try demoting the last admin → 400 with "Cannot remove or demote the last admin".

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/users/
git commit -m "feat(api): admin user CRUD with self-protection and last-admin guard"
```

### Task 5.4: New user page

**Files:**
- Create: `app/admin/users/new/page.tsx`
- Create: `app/admin/users/new/NewUserForm.tsx`

- [ ] **Step 1: Page**

Create `app/admin/users/new/page.tsx`:

```tsx
import NewUserForm from "./NewUserForm"
export default function NewUserPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">New user</h1>
      <NewUserForm />
    </div>
  )
}
```

- [ ] **Step 2: Form**

Create `app/admin/users/new/NewUserForm.tsx`:

```tsx
"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function NewUserForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"viewer" | "okr_manager" | "admin">("viewer")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: name || undefined, password, role }),
    })
    setPending(false)
    if (res.ok) router.push("/admin/users")
    else setError((await res.json()).error ?? "Failed")
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-md">
      <div>
        <label className="block text-sm mb-1">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">Initial password</label>
        <input type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value as "viewer" | "okr_manager" | "admin")} className="w-full border rounded px-3 py-2">
          <option value="viewer">Viewer</option>
          <option value="okr_manager">OKR manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button disabled={pending} className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50">Create</button>
    </form>
  )
}
```

- [ ] **Step 3: Smoke test**

Create a new manager user. Sign in as them. Confirm role-appropriate UI.

- [ ] **Step 4: Commit**

```bash
git add app/admin/users/new/
git commit -m "feat(admin): add new-user page"
```

### Task 5.5: Edit user page

**Files:**
- Create: `app/admin/users/[id]/edit/page.tsx`
- Create: `app/admin/users/[id]/edit/EditUserForm.tsx`

- [ ] **Step 1: Page**

Create `app/admin/users/[id]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import EditUserForm from "./EditUserForm"

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  })
  if (!user) notFound()
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Edit user</h1>
      <p className="text-sm text-gray-500 mb-4">{user.email}</p>
      <EditUserForm user={user} />
    </div>
  )
}
```

- [ ] **Step 2: Form**

Create `app/admin/users/[id]/edit/EditUserForm.tsx`:

```tsx
"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

type U = { id: string; email: string; name: string | null; role: string }

export default function EditUserForm({ user }: { user: U }) {
  const router = useRouter()
  const [name, setName] = useState(user.name ?? "")
  const [role, setRole] = useState(user.role)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || null, role }),
    })
    setPending(false)
    if (res.ok) router.push("/admin/users")
    else setError((await res.json()).error ?? "Failed")
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-md">
      <div>
        <label className="block text-sm mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border rounded px-3 py-2">
          <option value="viewer">Viewer</option>
          <option value="okr_manager">OKR manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button disabled={pending} className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50">Save</button>
    </form>
  )
}
```

- [ ] **Step 3: Smoke test**

Edit a user's role from viewer → okr_manager. Sign in as that user → Edit buttons now visible.

- [ ] **Step 4: Commit**

```bash
git add app/admin/users/\[id\]/edit/
git commit -m "feat(admin): add edit-user page"
```

### Task 5.6: Reset password page + API

**Files:**
- Create: `app/api/admin/users/[id]/reset-password/route.ts`
- Create: `app/admin/users/[id]/reset-password/page.tsx`
- Create: `app/admin/users/[id]/reset-password/ResetForm.tsx`

- [ ] **Step 1: API**

Create `app/api/admin/users/[id]/reset-password/route.ts`:

```ts
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

const schema = z.object({ password: z.string().min(8).max(200) })

export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireRole("admin")
    const { id } = await ctx.params
    const { password } = schema.parse(await req.json())
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    })
    // Invalidate existing sessions for the affected user
    await prisma.session.deleteMany({ where: { userId: id } })
    return NextResponse.json({ ok: true })
  }
)
```

- [ ] **Step 2: Page**

Create `app/admin/users/[id]/reset-password/page.tsx`:

```tsx
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ResetForm from "./ResetForm"

export default async function ResetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } })
  if (!user) notFound()
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Reset password</h1>
      <p className="text-sm text-gray-500 mb-4">{user.email}</p>
      <ResetForm userId={user.id} />
    </div>
  )
}
```

- [ ] **Step 3: Form**

Create `app/admin/users/[id]/reset-password/ResetForm.tsx`:

```tsx
"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function ResetForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    setPending(false)
    if (res.ok) {
      setDone(true)
      setTimeout(() => router.push("/admin/users"), 1500)
    } else {
      setError((await res.json()).error ?? "Failed")
    }
  }

  if (done) return <p className="text-green-600">Password reset. Existing sessions were invalidated.</p>

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-md">
      <div>
        <label className="block text-sm mb-1">New password</label>
        <input type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button disabled={pending} className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50">Set password</button>
    </form>
  )
}
```

- [ ] **Step 4: Smoke test**

Reset a user's password. That user's existing session (open in another browser) should stop working on next request. Sign in with the new password.

- [ ] **Step 5: Commit**

```bash
git add app/admin/users/\[id\]/reset-password/ app/api/admin/users/\[id\]/reset-password/
git commit -m "feat(admin): add password reset for users"
```

### Task 5.7: Self-service password change

**Files:**
- Create: `app/account/page.tsx`
- Create: `app/account/PasswordForm.tsx`
- Create: `app/api/account/password/route.ts`

- [ ] **Step 1: API**

Create `app/api/account/password/route.ts`:

```ts
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, HttpError } from "@/lib/auth/rbac"
import { withErrorHandling } from "@/lib/http"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
})

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireAuth()
  const body = schema.parse(await req.json())
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })
  if (!user.passwordHash) throw new HttpError(400, "This account has no password set")
  const ok = await bcrypt.compare(body.currentPassword, user.passwordHash)
  if (!ok) throw new HttpError(400, "Current password is incorrect")
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(body.newPassword, 12) },
  })
  return NextResponse.json({ ok: true })
})
```

- [ ] **Step 2: Page**

Create `app/account/page.tsx`:

```tsx
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import PasswordForm from "./PasswordForm"

export default async function AccountPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Account</h1>
      <p className="text-sm text-gray-500 mb-4">{session.user.email}</p>
      <PasswordForm />
    </div>
  )
}
```

- [ ] **Step 3: Form**

Create `app/account/PasswordForm.tsx`:

```tsx
"use client"
import { useState } from "react"

export default function PasswordForm() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (next !== confirm) {
      setMessage({ kind: "err", text: "New passwords do not match" })
      return
    }
    setPending(true)
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    })
    setPending(false)
    if (res.ok) {
      setMessage({ kind: "ok", text: "Password updated." })
      setCurrent(""); setNext(""); setConfirm("")
    } else {
      setMessage({ kind: "err", text: (await res.json()).error ?? "Failed" })
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Current password</label>
        <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">New password</label>
        <input type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">Confirm new password</label>
        <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      {message && (
        <p className={message.kind === "ok" ? "text-green-600 text-sm" : "text-red-600 text-sm"}>{message.text}</p>
      )}
      <button disabled={pending} className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50">Update password</button>
    </form>
  )
}
```

- [ ] **Step 4: Add /account link in header**

In `app/layout.tsx` header area (from Task 2.8), add `<Link href="/account" className="text-sm text-indigo-600">Account</Link>` alongside the sign-out button.

- [ ] **Step 5: Smoke test**

Sign in as any user. Visit `/account`. Change password. Sign out, sign back in with new password. Try with wrong current password → error.

- [ ] **Step 6: Commit**

```bash
git add app/account/ app/api/account/ app/layout.tsx
git commit -m "feat(account): add self-service password change"
```

---

## Phase 6: Bootstrap & Docker

### Task 6.1: Bootstrap admin script

**Files:**
- Create: `scripts/bootstrap-admin.ts`
- Modify: `package.json` (add script alias)

- [ ] **Step 1: Script**

Create `scripts/bootstrap-admin.ts`:

```ts
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

async function main() {
  const prisma = new PrismaClient()
  try {
    const count = await prisma.user.count()
    if (count > 0) {
      console.log(`[bootstrap-admin] ${count} user(s) already exist; skipping.`)
      return
    }
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_INITIAL_PASSWORD
    if (!email || !password) {
      console.error(
        "[bootstrap-admin] ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD must be set for first boot."
      )
      process.exit(1)
    }
    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: "Admin",
        role: "admin",
        passwordHash: await bcrypt.hash(password, 12),
      },
    })
    console.log(`[bootstrap-admin] Created admin ${email}. CHANGE THIS PASSWORD ON FIRST LOGIN.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 2: Add npm script**

Open `package.json`. Add to `"scripts"`:

```json
"bootstrap:admin": "tsx scripts/bootstrap-admin.ts"
```

- [ ] **Step 3: Manual smoke test**

Run (after clearing your dev user):
```bash
ADMIN_EMAIL=admin@test.local ADMIN_INITIAL_PASSWORD=adminpass1 npm run bootstrap:admin
```
Expected: creates admin. Re-run → "N user(s) already exist; skipping."

- [ ] **Step 4: Commit**

```bash
git add scripts/bootstrap-admin.ts package.json
git commit -m "feat: bootstrap admin script for first boot"
```

### Task 6.2: Docker entrypoint integration

**Files:**
- Modify: `docker-entrypoint.sh`
- Modify: `Dockerfile` (if `tsx` is needed at runtime)

- [ ] **Step 1: Read current entrypoint**

Run: `cat docker-entrypoint.sh`

- [ ] **Step 2: Decide invocation strategy**

Since `tsx` is a devDependency, for production images we compile `scripts/bootstrap-admin.ts` to JS at build time. Simpler alternative: run via `node --experimental-strip-types` on Node 22+, OR bundle `tsx` as a runtime dep.

Pick the simplest path: move `tsx` from `devDependencies` to `dependencies` so it's present in the production image.

Run: `npm uninstall tsx && npm install tsx`

- [ ] **Step 3: Update entrypoint**

Edit `docker-entrypoint.sh`. Between `prisma migrate deploy` and the `exec` line, add:

```sh
echo "Running bootstrap-admin..."
npx tsx scripts/bootstrap-admin.ts || echo "bootstrap-admin completed with non-zero exit (ignored if non-critical)"
```

If `ADMIN_EMAIL`/`ADMIN_INITIAL_PASSWORD` are unset, the script exits non-zero. That's the correct behaviour only on first boot. On subsequent boots it returns 0. **Don't** mask first-boot errors — remove the `|| echo` fallback and let the container fail fast if required env vars are missing:

```sh
echo "Running bootstrap-admin..."
npx tsx scripts/bootstrap-admin.ts
```

- [ ] **Step 4: Commit**

```bash
git add docker-entrypoint.sh package.json package-lock.json
git commit -m "feat(docker): run bootstrap-admin during container start"
```

### Task 6.3: Docker compose env vars

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add env block**

Under the `okr` service in `docker-compose.yml`, add:

```yaml
environment:
  - DATABASE_URL=file:/data/okr.db
  - AUTH_SECRET=${AUTH_SECRET:?AUTH_SECRET is required}
  - AUTH_URL=${AUTH_URL:-http://localhost:3000}
  - ADMIN_EMAIL=${ADMIN_EMAIL:-}
  - ADMIN_INITIAL_PASSWORD=${ADMIN_INITIAL_PASSWORD:-}
  # Optional — activates Slack login when both are set
  - SLACK_CLIENT_ID=${SLACK_CLIENT_ID:-}
  - SLACK_CLIENT_SECRET=${SLACK_CLIENT_SECRET:-}
```

(If an `environment` block already exists, merge these in.)

- [ ] **Step 2: Smoke test build**

Run:
```bash
AUTH_SECRET=$(openssl rand -hex 32) ADMIN_EMAIL=admin@test.local ADMIN_INITIAL_PASSWORD=adminpass1 docker compose up --build
```

Expected: container starts, bootstrap-admin logs "Created admin admin@test.local", app listens on port 3000. Navigate to `http://localhost:3000` → redirects to `/login`. Sign in → dashboard.

Stop with `docker compose down`.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): expose AUTH_SECRET and admin bootstrap env vars"
```

---

## Phase 7: Light API tests for `requireRole`

No test harness exists. Install a minimal one to assert RBAC at the handler level — limited scope, no UI tests.

### Task 7.1: Install Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install**

Run: `npm install -D vitest @vitest/ui`

- [ ] **Step 2: Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    globals: true,
  },
})
```

- [ ] **Step 3: Add test script**

In `package.json` `"scripts"`, add: `"test": "vitest run"`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(test): add vitest"
```

### Task 7.2: Unit test for `hasRole`

**Files:**
- Create: `lib/auth/rbac.test.ts`

- [ ] **Step 1: Tests**

Create `lib/auth/rbac.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { hasRole } from "./rbac"

describe("hasRole", () => {
  it("returns false when userRole is undefined", () => {
    expect(hasRole(undefined, "viewer")).toBe(false)
  })
  it("viewer meets viewer", () => {
    expect(hasRole("viewer", "viewer")).toBe(true)
  })
  it("viewer does not meet okr_manager", () => {
    expect(hasRole("viewer", "okr_manager")).toBe(false)
  })
  it("okr_manager meets viewer", () => {
    expect(hasRole("okr_manager", "viewer")).toBe(true)
  })
  it("admin meets everything", () => {
    expect(hasRole("admin", "viewer")).toBe(true)
    expect(hasRole("admin", "okr_manager")).toBe(true)
    expect(hasRole("admin", "admin")).toBe(true)
  })
})
```

- [ ] **Step 2: Run**

Run: `npm test`
Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/auth/rbac.test.ts
git commit -m "test(auth): unit tests for hasRole"
```

### Task 7.3: Unit test for `computeDiff`

**Files:**
- Create: `lib/audit.test.ts`

- [ ] **Step 1: Tests**

Create `lib/audit.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { computeDiff } from "./audit"

describe("computeDiff", () => {
  const fields = ["title", "description", "status"]

  it("returns empty when nothing changed", () => {
    expect(
      computeDiff(
        { title: "a", description: "b", status: "active" },
        { title: "a", description: "b", status: "active" },
        fields
      )
    ).toEqual({})
  })

  it("captures a single field change", () => {
    expect(
      computeDiff(
        { title: "a", description: "b", status: "active" },
        { title: "A", description: "b", status: "active" },
        fields
      )
    ).toEqual({ title: { from: "a", to: "A" } })
  })

  it("treats undefined and null identically", () => {
    expect(
      computeDiff(
        { title: "a", description: undefined, status: "active" },
        { title: "a", description: null, status: "active" },
        fields
      )
    ).toEqual({})
  })

  it("captures multiple changes", () => {
    expect(
      computeDiff(
        { title: "a", description: "b", status: "active" },
        { title: "A", description: "B", status: "active" },
        fields
      )
    ).toEqual({
      title: { from: "a", to: "A" },
      description: { from: "b", to: "B" },
    })
  })
})
```

- [ ] **Step 2: Run**

Run: `npm test`
Expected: all tests pass (previous + 4 new).

- [ ] **Step 3: Commit**

```bash
git add lib/audit.test.ts
git commit -m "test(audit): unit tests for computeDiff"
```

---

## Phase 8: Documentation & manual verification

### Task 8.1: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add an "Authentication & Roles" section**

Insert before the "Data Model" section:

```markdown
## 🔐 Authentication & Roles

Waypoint requires login. Three roles:

| Role | Capabilities |
|---|---|
| `viewer` | Read dashboards, objectives, history |
| `okr_manager` | Create/edit/delete objectives and key results, check in |
| `admin` | Manage users, quarters, teams, tags (at `/admin`) |

### First boot

Set `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` on first container start — Waypoint will create the first admin user. **Change this password on first login** (via `/account`).

Required env vars:

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random 32+ byte secret. Generate: `openssl rand -hex 32` |
| `AUTH_URL` | Base URL (e.g. `https://waypoint.example.com`) |
| `ADMIN_EMAIL` | First-boot admin email |
| `ADMIN_INITIAL_PASSWORD` | First-boot admin password (CHANGE ON FIRST LOGIN) |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | Optional. When both are set, a "Continue with Slack" button appears. Login is only permitted for users that already exist (invite-only). |

### Managing users

Navigate to `/admin` (admins only; not linked in the UI). From there you can create users, change roles, reset passwords, and delete accounts. At least one admin must always exist; admins cannot delete or demote themselves.

### Audit history

Every objective and key result change is recorded. Open an objective detail page to see its change history.
```

- [ ] **Step 2: Update "Environment Variables" table**

Replace the minimal table with the list above (merging `DATABASE_URL`).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document authentication, roles, and admin"
```

### Task 8.2: Update TODOS.md (per project convention)

**Files:**
- Modify: `TODOS.md` (create if absent)

- [ ] **Step 1: Add or append phase checklist**

If `TODOS.md` doesn't exist, create it. Otherwise append:

```markdown
## Auth & RBAC

- [x] Phase 1: Dependencies and schema
- [x] Phase 2: Auth.js + login
- [x] Phase 3: RBAC enforcement across the API
- [x] Phase 4: Audit history
- [x] Phase 5: Admin UI
- [x] Phase 6: Bootstrap & Docker
- [x] Phase 7: Light API tests
- [x] Phase 8: Documentation
```

(Executor should only check off a phase after all its tasks pass.)

- [ ] **Step 2: Commit**

```bash
git add TODOS.md
git commit -m "docs: add auth & RBAC phase checklist"
```

### Task 8.3: Final manual smoke test matrix

**Not a code change — a verification gate before marking the plan complete.** Execute each row and confirm expected behaviour. If any row fails, fix and re-test.

| Scenario | Expected |
|---|---|
| Unauthenticated GET `/` | Redirect to `/login?callbackUrl=/` |
| Unauthenticated GET `/admin` | Redirect to `/login?callbackUrl=/admin` |
| Sign in as viewer, GET `/` | Dashboard loads; no Edit/Create/Delete buttons |
| Viewer POST `/api/objectives` | 403 |
| Viewer GET `/admin` | Redirect to `/` |
| Sign in as manager, create objective | Success; `AuditLog` row written; `Objective.createdById` = manager id |
| Manager edit objective title | Success; `AuditLog` update row with `title` diff |
| Manager POST `/api/teams` | 403 |
| Manager creates check-in | Success; `CheckIn.userId` = manager id |
| Sign in as admin, visit `/admin/users` | Table renders |
| Admin creates new viewer user | Visible in users list; user can sign in |
| Admin tries to demote self (role → viewer) | 400 "You cannot demote yourself" |
| Admin tries to delete last admin (after deleting self-test user) | 400 "Cannot remove or demote the last admin" |
| Admin resets user password | Target user's existing session invalidated; can sign in with new password |
| Visit `/account` and change password | Success; sign out and sign back in with new password |
| Open objective detail page | History panel shows chronological entries |
| Delete a user who authored an objective | Objective remains; `createdById` is `NULL`; history shows "deleted user" |
| Set `SLACK_CLIENT_ID`+`SECRET` + restart | "Continue with Slack" button appears on `/login`; `/api/auth/providers` lists slack |

Record results in the PR description.

---

## Self-review

Performed against spec `docs/superpowers/specs/2026-04-17-auth-and-rbac-design.md`:

- **§1 Goals / Roles** — covered by Phase 3 enforcement + Phase 5 admin UI ✓
- **§2 Architecture** — Auth.js v5 + Prisma adapter + credentials + dormant Slack in Task 2.3; DB sessions in Task 2.3; middleware in Task 2.7; `requireRole` in Task 2.1 + Phase 3 ✓
- **§3 Data model** — covered by Task 1.2 ✓
- **§4 RBAC enforcement** — `lib/auth/rbac.ts` in Task 2.1; permission map implemented across Phase 3 ✓
- **§5 Audit history** — Phase 4 in full ✓
- **§6 Admin UI** — Phase 5 covers landing, users list/new/edit/reset-password, self-account, safety rails ✓
- **§7 Environment & deployment** — Phase 6 ✓
- **§8 File layout** — matches plan's file structure section ✓
- **§9 Testing** — Phase 7 (unit tests for `hasRole` and `computeDiff`) + Task 8.3 manual smoke matrix ✓
- **§10 Deferred** — explicitly not in plan (Slack activation, SMTP reset, self-signup, team-scoping, quarter/team/tag audit, MFA, full test harness) ✓

No placeholders detected. Type names (`Role`, `requireRole`, `recordChange`, `computeDiff`, `HttpError`, `withErrorHandling`) consistent throughout.
