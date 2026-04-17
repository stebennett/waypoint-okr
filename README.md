# 🎯 Waypoint

A full-stack OKR (Objectives and Key Results) management application built with Next.js 14, Prisma, and SQLite.

## Features

- **Dashboard** — Quarter-aware overview of company and team objectives
- **Team OKRs** — Per-team objective tracking with KR progress
- **Quarterly Planning** — Create and manage planning quarters, close with final scores
- **Weekly Check-in** — Polished check-in flow with sliders for progress and confidence
- **Tag Management** — Colour-coded tags for categorising objectives
- **Alignment** — Link team objectives to company objectives
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
| `AUTH_SECRET` | Random 32+ byte secret. Generate: `openssl rand -hex 32` | _(required)_ |
| `AUTH_URL` | Base URL (e.g. `https://waypoint.example.com`) | _(required in prod)_ |
| `ADMIN_EMAIL` | First-boot admin email | _(required on first start)_ |
| `ADMIN_INITIAL_PASSWORD` | First-boot admin password (CHANGE ON FIRST LOGIN) | _(required on first start)_ |
| `SLACK_CLIENT_ID` | Optional Slack OAuth app client ID | _(optional)_ |
| `SLACK_CLIENT_SECRET` | Optional Slack OAuth app client secret | _(optional)_ |

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-secret-here"
AUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@example.com"
ADMIN_INITIAL_PASSWORD="changeme"
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
│   │   ├── check-ins/
│   │   ├── key-results/[id]/
│   │   ├── objectives/
│   │   ├── quarters/
│   │   ├── tags/
│   │   └── teams/
│   ├── check-in/               # Weekly check-in page
│   ├── components/             # Shared UI components
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
│   ├── prisma.ts               # Prisma client singleton
│   └── utils.ts                # Shared utilities
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
- **Runtime:** Node.js 20
- **Containerisation:** Docker + Docker Compose
- **CI:** GitHub Actions (lint, type-check, build on PRs)
