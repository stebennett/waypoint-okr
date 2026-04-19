# CI for Pull Requests — Design

## Goal

Run lint, type-check, and build on every pull request targeting `main`, so issues are caught before merge.

## Scope

- Trigger: `pull_request` events (opened, synchronize, reopened) against `main`.
- Single job running three checks in sequence.
- No test framework yet — no `test` step in scope. Adding tests is a separate future effort.

## File

`.github/workflows/ci.yml`

## Workflow

```yaml
name: CI

on:
  pull_request:
    branches:
      - main

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: "file:/tmp/build.db"
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build
        env:
          NODE_ENV: production
```

## Rationale

- **PR-only trigger (not push):** avoids duplicate runs when contributors push to a branch that already has a PR open. PRs to `main` are the integration point that matters.
- **Concurrency with cancel-in-progress:** when new commits land on a PR, cancel the previous run. Saves CI minutes without losing signal.
- **Single job, sequential steps:** shares one `npm ci`. Splitting into parallel jobs would reinstall dependencies three times for marginal wall-clock gain on a small project.
- **Prisma generate before lint/type-check/build:** Prisma client types are imported throughout the app. Lint and `tsc` will fail without generated types. Mirrors the pattern in `deploy.yml`.
- **`DATABASE_URL=file:/tmp/build.db`:** Prisma requires the env var to be set even for `generate` and `build`. Matches the deploy workflow.
- **`tsc --noEmit` in addition to lint:** `next lint` does not type-check. Running `tsc` catches type errors that lint misses.
- **`npm run build` last:** catches Next.js-specific build issues (route collisions, invalid metadata, etc.) that neither lint nor `tsc` catch.

## Non-goals

- No test runner (no tests exist).
- No Node matrix (project targets Node 20).
- No deploy preview — that's handled by the existing deploy workflow on `main`.
- No coverage reporting, no caching beyond the built-in npm cache.

## Success criteria

- Opening a PR to `main` triggers the `CI` workflow.
- Workflow fails if any of lint, type-check, or build fail.
- Pushing new commits to an open PR cancels the previous run and starts a new one.
- Workflow does not run on direct pushes to `main` (deploy workflow already handles that path).
