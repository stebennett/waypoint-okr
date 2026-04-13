# 🎯 OKR Manager

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

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./dev.db"
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

## ☁️ Cloudflare Pages Deployment

> ⚠️ **Important Limitation:** SQLite does not work on Cloudflare Pages (no persistent filesystem). The GitHub Actions workflow deploys the static/edge frontend, but **API routes that require the database will not function** on Cloudflare Pages.

### What works on Cloudflare Pages

- Static page rendering (if you pre-render pages)
- Edge middleware
- UI preview deployments

### What doesn't work

- All `/api/*` routes (require SQLite)
- Any dynamic data fetching

### Recommended approach for production

**Use the Docker image** (see above) for a fully functional deployment with the database.

### Future: Cloudflare D1

To make this app fully Cloudflare-native, you would need to:

1. Replace Prisma + SQLite with [Prisma + Cloudflare D1](https://www.prisma.io/docs/orm/overview/databases/cloudflare-d1) or [Drizzle ORM](https://orm.drizzle.team/docs/get-started-sqlite#cloudflare-d1)
2. Bind your D1 database in `wrangler.toml`
3. Update API routes to use the D1 binding from the Cloudflare worker context

This is left as future work.

### GitHub Actions Setup

1. Add these secrets to your GitHub repository (Settings → Secrets → Actions):
   - `CLOUDFLARE_API_TOKEN` — A Cloudflare API token with Pages edit permissions
   - `CLOUDFLARE_ACCOUNT_ID` — Your Cloudflare account ID

2. Create the Cloudflare Pages project named `okr-app` in your Cloudflare dashboard (or let the action create it on first deploy).

3. Push to `main` — the workflow will build and deploy automatically.

The workflow:
- Runs on push to `main`
- Installs dependencies
- Generates Prisma client
- Builds with `@cloudflare/next-on-pages`
- Deploys `.vercel/output/static` to Cloudflare Pages

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
│   └── deploy.yml              # Cloudflare Pages CI/CD
├── docker-compose.yml
├── Dockerfile
├── docker-entrypoint.sh
├── next.config.ts
├── tailwind.config.ts
└── wrangler.toml
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
- **Runtime:** Node.js 20
- **Containerisation:** Docker + Docker Compose
- **CI/CD:** GitHub Actions → Cloudflare Pages
