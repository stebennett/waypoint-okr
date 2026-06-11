# 🎯 Waypoint

A full-stack OKR (Objectives and Key Results) management application built with Next.js 14, Prisma, and SQLite.

## Features

- **Dashboard** — Quarter-aware overview of company and team objectives
- **Team OKRs** — Per-team objective tracking with KR progress
- **Quarterly Planning** — Create and manage planning quarters, close with final scores
- **Weekly Check-in** — Polished check-in flow with sliders for progress and confidence
- **Tag Management** — Colour-coded tags for categorising objectives
- **Alignment** — Link team objectives to company objectives
- **JIRA Sync** — Optionally link a key result to a JIRA JQL query and populate progress from the share of Done issues, on demand via a Sync button
- **Slack Login** — Optionally protect the whole app behind "Sign in with Slack"
- **Progress Visualisation** — Red/amber/green progress bars throughout

---

## 🚀 Local Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Clone and install
git clone <your-repo>
cd okr-app
npm install

# Set up the database
cp .env.example .env  # or create .env with DATABASE_URL
npx prisma migrate dev --name init

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Prisma database URL | `file:./dev.db` |
| `JIRA_BASE_URL` | JIRA site URL for KR sync, e.g. `https://yourcompany.atlassian.net` (optional) | — |
| `JIRA_EMAIL` | JIRA account email for Basic auth (optional) | — |
| `JIRA_API_TOKEN` | JIRA API token (optional) | — |
| `AUTH_SLACK_ID` | Slack app Client ID for login (optional) | — |
| `AUTH_SLACK_SECRET` | Slack app Client Secret for login (optional) | — |
| `AUTH_SECRET` | Secret for signing session tokens, e.g. `openssl rand -hex 32` (required for Slack login) | — |
| `AUTH_URL` | Public URL of the app, e.g. `https://okr.example.com` (optional; auto-detected) | — |
| `AUTH_SLACK_TEAM_ID` | Restrict login to a single Slack workspace ID, e.g. `T012AB3CD` (optional) | — |
| `AUTH_ALLOWED_EMAIL_DOMAINS` | Comma-separated verified email domains allowed to sign in, e.g. `acme.com,acme.io` (optional) | — |

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./dev.db"
```

### JIRA Sync (optional)

Set the three `JIRA_*` variables to enable syncing key result progress from JIRA.
Link a key result to a JQL query on the objective detail page, then click **⟳ Sync**:
Waypoint counts the issues matching the query and those with `statusCategory = Done`,
and records `done / total` as a new check-in (e.g. "JIRA sync: 5 of 8 issues done").
Progress only updates when you click Sync — there is no background polling.

### Slack Login (optional)

Waypoint can require users to sign in with Slack before accessing any page or
API route. Authentication is enabled only when `AUTH_SLACK_ID`,
`AUTH_SLACK_SECRET` and `AUTH_SECRET` are all set — otherwise the app stays
open, as before.

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps) in your workspace.
2. Under **OAuth & Permissions**, add the redirect URL
   `https://<your-host>/api/auth/callback/slack`. Slack requires **HTTPS**
   redirect URLs, so local development needs a tunnel such as ngrok or
   Cloudflare Tunnel.
3. Copy the **Client ID** and **Client Secret** from **Basic Information**
   into `AUTH_SLACK_ID` and `AUTH_SLACK_SECRET`.
4. Generate a session secret: `openssl rand -hex 32` → `AUTH_SECRET`.

Sessions are stateless JWTs (no database tables). Signed-in users see their
name and a Sign out button in the navigation bar. `/api/health` stays public
for healthchecks.

**Restricting who can sign in.** By default any Slack identity the app can
authenticate gets a session — which, for a workspace-installed app, includes
single- and multi-channel **guests**, and for a distributed app includes any
Slack account. Set either control (or both) to limit access:

- `AUTH_SLACK_TEAM_ID` — only members of that workspace may sign in. Find the
  ID (starts with `T`) in Slack under your workspace's URL/admin, or in the
  app's OAuth response.
- `AUTH_ALLOWED_EMAIL_DOMAINS` — only users whose **verified** Slack email is
  in one of the listed domains may sign in. This is the control that keeps
  external guests out even within your own workspace.

Anyone failing the configured checks is denied a session even after Slack
authenticates them.

### Tests

```bash
npm test          # Run the Vitest suite once
npm run test:watch
```

---

## 🐳 Docker Compose (Recommended for Self-Hosting)

The easiest way to run in production. Data is persisted in a named Docker volume.

```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f okr

# Stop
docker compose down

# Stop and remove data (destructive!)
docker compose down -v
```

The app will be available at [http://localhost:3000](http://localhost:3000).

Database migrations run automatically on container start.

### Custom Port

Edit `docker-compose.yml` to change the port:

```yaml
ports:
  - "8080:3000"  # host:container
```

---

## 🔧 Docker (Manual Build)

```bash
# Build
docker build -t okr-app .

# Run
docker run -d \
  -p 3000:3000 \
  -v okr-data:/data \
  -e DATABASE_URL=file:/data/okr.db \
  --name okr-app \
  okr-app

# Migrations run automatically via docker-entrypoint.sh
```

---

## 📁 Project Structure

```
okr-app/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/[...nextauth]/ # Auth.js (Slack login) handlers
│   │   ├── check-ins/
│   │   ├── health/             # Public healthcheck endpoint
│   │   ├── key-results/[id]/
│   │   ├── objectives/
│   │   ├── quarters/
│   │   ├── tags/
│   │   └── teams/
│   ├── check-in/               # Weekly check-in page
│   ├── components/             # Shared UI components
│   ├── login/                  # Slack sign-in page
│   ├── objectives/
│   │   ├── [id]/               # Objective detail
│   │   └── new/                # Create objective
│   ├── quarters/               # Quarter management
│   ├── tags/                   # Tag management
│   ├── teams/                  # Team management
│   ├── DashboardClient.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Dashboard
├── lib/
│   ├── auth-config.ts          # Slack login env validation + public paths
│   ├── jira.ts                 # JIRA sync client
│   ├── prisma.ts               # Prisma client singleton
│   └── utils.ts                # Shared utilities
├── auth.ts                     # Auth.js (NextAuth) setup
├── middleware.ts               # Session enforcement when login is enabled
├── prisma/
│   ├── migrations/
│   └── schema.prisma           # Database schema
├── .github/workflows/
│   └── ci.yml                  # Lint, type-check, build on PRs
├── docker-compose.yml
├── Dockerfile
├── docker-entrypoint.sh
├── next.config.ts
└── tailwind.config.ts
```

---

## 🔄 Data Model

- **Team** — A group of people with their own objectives
- **Quarter** — A time period (e.g. Q2 2026) containing objectives
- **Objective** — A goal at company or team level, optionally aligned to a company objective
- **KeyResult** — A measurable outcome under an objective
- **CheckIn** — A weekly progress/confidence update on a key result
- **Tag** — A colour-coded label for categorising objectives

---

## 📊 Progress Colours

| Range | Colour | Meaning |
|-------|--------|---------|
| 0–33% | 🔴 Red | At risk |
| 34–66% | 🟡 Amber | Progressing |
| 67–100% | 🟢 Green | On track |

---

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** SQLite (via Prisma ORM)
- **Auth:** Auth.js (NextAuth v5) with Slack OIDC, optional
- **Runtime:** Node.js 20
- **Containerisation:** Docker + Docker Compose
- **CI:** GitHub Actions (lint, type-check, build on PRs)
