# JIRA Query Sync for Key Result Progress — Design

Date: 2026-06-10
Status: Approved (autonomous goal session; decisions documented here and in the PR)

## Problem

Progress on a KeyResult is currently entered manually via check-ins. Teams that track
delivery in JIRA want progress derived from real work: the percentage of issues in a
JQL query that are Done. The value must only change when a user explicitly clicks
"Sync" — no background polling.

## Approaches considered

1. **Per-KR JQL + on-demand sync endpoint (chosen).** Store an optional JQL string on
   `KeyResult`. A `POST /api/key-results/[id]/sync` route queries JIRA for total vs
   done counts and records the result as a normal `CheckIn`. Minimal schema change,
   reuses the existing progress model, history shows every sync.
2. Background scheduled sync. Rejected: requirement is explicit user-triggered sync only.
3. Full JIRA integration entity (separate model storing connection + saved queries).
   Rejected as YAGNI: a single instance-wide JIRA connection via env vars is enough.

## Data model

`KeyResult` gains two optional columns (SQLite migration via Prisma):

- `jiraJql String?` — the JQL query linked to this KR
- `jiraSyncedAt DateTime?` — timestamp of the last successful sync

Progress is **not** stored on the KR; a successful sync creates a `CheckIn`:

- `progress` = `round(done / total * 100)` (0 when the query matches 0 issues)
- `confidence` = carried over from the latest check-in, default 50
- `notes` = e.g. `JIRA sync: 5 of 8 issues done`
- `checkedInBy` = `JIRA Sync`

This keeps the existing progress pipeline (latest check-in wins) untouched and makes
every sync auditable in history.

## JIRA connection

Instance-wide configuration via environment variables (same pattern as `DATABASE_URL`):

- `JIRA_BASE_URL` — e.g. `https://yourcompany.atlassian.net`
- `JIRA_EMAIL` — account email for Basic auth
- `JIRA_API_TOKEN` — API token

`lib/jira.ts` exposes:

- `getJiraConfig()` — reads env, returns `null` if any var is missing
- `countIssues(config, jql)` — issue count for a JQL string.
  Primary: `POST /rest/api/3/search/approximate-count` (current JIRA Cloud API; the
  legacy `/rest/api/3/search` `total` field was removed in 2025).
  Fallback on HTTP 404/405 (JIRA Server/Data Center): `GET /rest/api/2/search?maxResults=0`
  and read `total`.
- `fetchProgress(config, jql)` — runs two counts: the raw JQL (total) and
  `(<jql>) AND statusCategory = Done` (done), returns `{ total, done, progress }`.
  `statusCategory = Done` is JIRA's canonical "completed" bucket and works regardless
  of custom workflow status names.
- Errors are thrown as `JiraError` with a human-readable message (auth failure, bad
  JQL, network failure) so the route can surface them.

## API

- `POST /api/key-results/[id]/sync`
  - `404` — KR not found
  - `400` — KR has no `jiraJql`
  - `503` — JIRA env vars not configured
  - `502` — JIRA request failed (message passed through)
  - `200` — `{ keyResult, sync: { total, done, progress } }` where `keyResult` includes
    the newly created check-in and updated `jiraSyncedAt`
- `PUT /api/key-results/[id]` additionally accepts `jiraJql` (string to set, empty/null
  to clear), following the existing partial-update pattern.
- `POST /api/objectives/[id]/key-results` additionally accepts optional `jiraJql`.

## UI (ObjectiveDetailClient)

- **Add KR form**: optional "JIRA JQL (optional)" text input.
- **KR card**:
  - No JQL: a small "Link JIRA query" affordance toggles an inline input + Save.
  - With JQL: the query is shown (monospace, truncated) with **Sync**, **Edit**, and
    **Remove** controls. Sync shows a spinner state, then refreshes the objective;
    failures render an inline error message. Last sync time shown via `jiraSyncedAt`.
- Controls only render while the objective is `active`, matching existing behavior.

## UI (CheckInClient)

The weekly Check-In page gets the same per-KR controls, since it is the primary
surface for working with current key results: link/edit a JQL inline (empty value
unlinks), and a Sync button that records the JIRA-derived check-in and updates the
progress slider to the synced value. All controls use `type="button"` so they don't
submit the surrounding check-in form.

## Error handling

- Unconfigured JIRA: sync button still renders; the route returns 503 and the UI shows
  "JIRA is not configured on this server".
- Invalid JQL / auth errors: 502 with JIRA's message, shown inline under the KR.
- Sync never partially writes: check-in creation and `jiraSyncedAt` update happen in a
  single transaction after a successful JIRA response.

## Testing

The repo has no test suite; this feature introduces **Vitest** (unit level, no jsdom):

- `lib/jira.test.ts` — config parsing, progress math (rounding, zero-total), done-JQL
  wrapping, approximate-count happy path, 404 fallback to v2 search, auth/JQL errors
  (global `fetch` mocked).
- `app/api/key-results/[id]/sync/route.test.ts` — 404 / 400 / 503 / 502 / success
  behaviors with `@/lib/prisma` and `@/lib/jira` mocked.
- `npm test` script; CI gains a "Test" step.

## Out of scope

- Per-user or per-team JIRA credentials
- Automatic/background syncing
- Weighted progress (story points); counts only
