# Stage 1: Dependencies
FROM node:22-alpine AS deps
# Build tools let better-sqlite3 compile if no prebuilt musl binary is available
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Stage 2: Builder
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
ENV DATABASE_URL="file:/tmp/build.db"

RUN npx prisma generate
RUN npm run build

# Stage 3: Prisma CLI for running migrations at container start
FROM node:22-alpine AS migrator
WORKDIR /migrator

COPY package-lock.json ./
RUN PRISMA_VERSION=$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version") \
 && DOTENV_VERSION=$(node -p "require('./package-lock.json').packages['node_modules/dotenv'].version") \
 && echo '{"private":true}' > package.json \
 && npm install --omit=dev --no-audit --no-fund prisma@$PRISMA_VERSION dotenv@$DOTENV_VERSION

# Stage 4: Runner
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV DATABASE_URL="file:/data/okr.db"
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create data directory
RUN mkdir -p /data && chown nextjs:nodejs /data

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma CLI, config and migrations (needed for migrations at runtime)
COPY --from=migrator /migrator/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown nextjs:nodejs docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
