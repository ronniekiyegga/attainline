# Attainline

School analytics for understanding student attainment, attendance and
intervention priorities.

This repository contains an incremental rebuild of EduFeedbackPro.
Existing features are being reviewed and migrated individually.

## Current implementation

- Student directory page at `/`, inside a dashboard shell (sidebar,
  header, collapsed icon rail and mobile navigation dialog).
- Student profile at `/students/<id>?year=`, opened from the directory as
  a dialog or directly as a page, with that year's CAT4, NGRT and Progress
  Test results, each result's previous sitting, and EduFeedbackPro's
  status and priority definitions.
- Staff sign-in with server-side sessions, school memberships, switching
  between schools and sign-out. The shell shows the signed-in staff member,
  their role and the active school.
- Teacher and leadership dashboards at `/dashboard`, cohort analytics at
  `/analytics`, and assessment rankings at `/rankings`, with school and
  assigned-year-group restrictions enforced by the API.
- Express API with separate HTTP liveness and database readiness endpoints.
- Prisma schema and migrations for organisations, students, annual
  enrolments, assessment results, staff users, memberships, year-group
  assignments, sessions and sign-in throttling.
- Student directory API restricted to the session's school and, for heads
  of year and teachers, their assigned year groups, with academic-year
  placement (year group and class), server-side search and encrypted keyset
  cursors bound to the year and search.
- Request IDs shared by the web app and API, and structured JSON failure logs.
- API unit tests, PostgreSQL integration tests and Playwright browser tests.
- pnpm workspace with TypeScript and one root lockfile.
- GitHub Actions for linting, type checking, tests, builds and browser tests.
- Multi-stage API Docker image and local PostgreSQL through Compose.

Only independently invented demo records are supported. See
[Authentication](#authentication) for what the access model does and does
not cover.

## Scope boundary

Not planned for this rebuild: question-level analysis, interventions,
attendance, notifications, spreadsheet or warehouse imports and the
conversational assistant.

## Structure

- `apps/web`: Next.js frontend. Features live in `src/features/<feature>`;
  server-only calls to the API go through `src/server/attainline-api.ts`.
- `apps/api`: Express API. Each feature in `src/features/<feature>` has a
  router (endpoints and middleware), a controller (request validation and
  HTTP responses), a service (business rules and use cases) and a
  repository (Prisma queries). The Prisma schema and migrations hold the
  models, relations and constraints.

The web app bundles Inter 4.001 by The Inter Project Authors under the
SIL Open Font License 1.1; the licence is in
`apps/web/public/fonts/LICENSE.txt`.

## Local development

Requirements: Node.js 24 and pnpm 12.8.1.

Install dependencies from the repository root:

```bash
pnpm install --frozen-lockfile
```

Copy `apps/api/.env.example` to `apps/api/.env`. Configure `DATABASE_URL`
there, and set `STUDENT_CURSOR_KEY` to the output of
`openssl rand -base64 32`. The API refuses to start without a valid key.

Point `DATABASE_URL` at the local Docker database below, or at another
database that holds only independently invented records.

The web app reads the API location from `ATTAINLINE_API_URL`. Copy
`apps/web/.env.example` to `apps/web/.env.local`, which sets
`ATTAINLINE_API_URL=http://localhost:4100`.
A path in that URL is kept as a prefix, so `http://host/api` requests
`http://host/api/students`; any query string or fragment is ignored.

For local PostgreSQL:

```bash
docker compose up -d --wait database
```

Apply migrations to the database configured in `apps/api/.env`:

```bash
pnpm --filter @attainline/api exec prisma migrate deploy
```

Migrations create the schema; they do not load data. To fill the local
Docker database with invented demo students (65 across two fictional
organisations, enough for three directory pages), their placements and
CAT4, NGRT and Progress Test results for 2025/26 and 2026/27, and three demo
staff accounts:

```bash
SEED_DATABASE_URL="postgresql://attainline:local-development-only@127.0.0.1:5433/attainline" pnpm --filter @attainline/api seed:demo
```

| Account | Access |
| --- | --- |
| `morgan.vale@example.test` | Headteacher at both fictional schools; can switch between them |
| `rowan.thistle@example.test` | Head of year for Year 9 at Fictional Demo Academy |
| `sasha.wren@example.test` | Teacher for Years 7 and 8 at Fictional Demo Academy |

All demo accounts use `AttainlineDemo!2026`. The sign-in form fills this
password automatically. Rerunning the seed resets these synthetic accounts
to the same password.

The seed refuses any target except the local `attainline` database. It
only adds missing domain rows and resets the reserved demo account passwords;
it never deletes existing rows, so it is safe to rerun. Each placement is derived from the student's `DEMO-`
reference, never from row order. Students in Year 7 in 2026/27 have no
2025/26 enrolment, some 2025/26 placements have no class, and surnames
repeat. When an existing enrolment differs from the demo placement, the
seed leaves it unchanged and reports how many differ. Every name and
`DEMO-` reference in it is invented.
Integration tests create their own fixtures and do not use it.

Start each application in a separate terminal:

```bash
pnpm dev:api
```

```bash
pnpm dev:web
```

- Sign in: http://localhost:3100/sign-in, with a seeded demo account
- Student directory: http://localhost:3100/
- API health: http://localhost:4100/health

`/health` returns `{"status":"ok"}` when the HTTP application responds.
`/ready` executes a database query and returns 200 when it succeeds or
503 when it fails. Readiness does not verify application tables.

The API defaults to port 4100. Set `PORT` to override it.

## Run the API and PostgreSQL with Docker

Requires Docker Desktop or Docker Engine with Compose.

From the repository root:

```bash
STUDENT_CURSOR_KEY="$(openssl rand -base64 32)" docker compose up --build -d --wait
curl -i http://localhost:4101/health
```

The container exposes the API at http://localhost:4101.
Local development uses port 4100.

Inspect status and logs:

```bash
docker compose ps
docker compose logs api
```

Stop and remove this project's containers and network:

```bash
docker compose down
```

The image runs compiled JavaScript as a non-root user and includes only
production package dependencies. Its healthcheck verifies HTTP liveness.

## Student directory API

`GET /students/academic-years` returns `academicYearStarts`: the academic
years in which the session's school has enrolments visible to the
signed-in staff member, newest first, or an empty list when there are
none.

`GET /students?academicYearStart=2026&limit=25` returns the students
enrolled in that academic year. `academicYearStart` is required. Each item
contains `id`, `institutionStudentRef`, `firstName`, `surname`, and that
year's `yearGroup` and `classGroup` (null when no class is recorded).

Responses contain `items`, `nextCursor` and `limit`. Request the next
page by passing the returned cursor as the `cursor` query parameter.
A null `nextCursor` means no further page was available when queried.

Page sizes range from 1 to 100. `sort` accepts only `surname-asc`
(the default) or `surname-desc`; results are ordered by surname, then by
ID in the same direction, so equal surnames keep a stable order. Offset
parameters are no longer accepted.

Surnames are limited to 100 characters (`VARCHAR(100)`). The accepted
cursor length is derived from that limit, so every stored student
produces a cursor the API will accept.

Keyset pagination avoids position shifts caused by inserts and deletes
before the cursor. It does not provide a snapshot: surname changes can
move students across the boundary, and new rows before it appear only
after restarting pagination.

Cursors are opaque AES-256-GCM tokens, so the surname and ID they carry
stay out of URLs, browser history and logs, and altered tokens are
rejected. Encryption is not authorisation: every query is still scoped
to the session's school and year groups, and a valid cursor from another
school is rejected. Changing `STUDENT_CURSOR_KEY` invalidates
cursors already issued.

Invalid parameters and cursors return a generic 400. Query failures
return 503.

Search with `GET /students?academicYearStart=2026&q=Velmira&limit=25`.

Search matches a partial first name, surname or student reference,
case-insensitively. The trimmed term is limited to 100 characters.
Changing the year, term or sort starts a new pagination sequence: a
cursor is only accepted with the academic year, search and sort it was
issued for.

`GET /students/:studentId?academicYearStart=2026` returns one student's
identity and placement for that year, with the same fields as a directory
item. A student from another organisation, or one without an enrolment in
that year, returns 404. Malformed IDs or years return 400.

The directory page shows the newest academic year by default, with tabs
for the others. The search field submits the term explicitly, and the
Student column header switches between A to Z and Z to A. Pagination,
refresh and retry keep the year, search and sort; changing any of them
returns to the first page while keeping the others.

The Refresh control re-fetches the current page in place and is disabled
while the request runs. The Columns control shows or hides the reference,
year group and class columns until the next full page load; searching
submits a form and reloads the page, so it resets them. Each
row's View action opens that row's placement for the selected year in a
dialog, without another request; focus returns to that row's action when
it closes.

Search terms appear in URLs. This implementation is restricted to
synthetic demo data.

See [the search decision](docs/decisions/student-directory-search.md)
for matching behaviour, pagination constraints and performance limits, and
[the annual placement decision](docs/decisions/student-directory-annual-placement.md)
for how the year is chosen and what placement does not cover, and
[the directory interaction decision](docs/decisions/student-directory-interactions.md)
for sorting, the details dialog and table state.

Every response carries an `X-Request-Id` header. An incoming UUID is
kept, so web and API log lines for one request share an ID; any other
value is replaced rather than echoed. Failure logs record Prisma and
PostgreSQL error codes, never messages, URLs, cursors or student data,
because driver messages can contain hosts, file paths and row values.

## Analytics API

`GET /analytics/overview?academicYearStart=2026` returns the visible
cohort's student count, assessment coverage, status distribution and
measure summaries. `GET /analytics/rankings?academicYearStart=2026&measure=CAT4_MEAN&yearGroup=9&page=1&limit=25`
returns a stable, paginated ranking plus the visible year groups for the
selected academic year.

Both endpoints require a session bearer token. Their repository query is
scoped to the active organisation and, for teachers and heads of year, to
assigned year groups. Ranking status and priority reuse the assessment
indicator implementation used by student profiles. See
[the analytics decision](docs/decisions/analytics-and-rankings.md) for the
aggregation, rendering and scaling boundaries.
Prisma reports some errors under `meta.driverAdapterError` and others,
such as check and restrict violations, as a raw adapter error with the
cause at the top level; the classifier reads both. Log fields accept only
primitive values, so errors, requests and query results cannot be logged
whole.


Search terms, academic years, sort orders and cursors travel in page and
API query strings, and student IDs appear in the API's details URL path.
They can therefore appear in browser history and in any proxy or hosting
access logs. The application's own logs record only request IDs and error
codes. Pages are sent with `no-store`, and the web app sets a
`no-referrer` policy. Real pupil data needs an access-log policy and a
review of these URLs first.

## Assessment results API

`GET /students/<id>/assessments?academicYearStart=2026` returns, for a
student visible to the session in that year, each measure's latest result
sat in the year: standard age score, stanine, national percentile rank,
raw score and its maximum where recorded, and the previous sitting of the
same measure when there is one. It also returns `status` and `priority`
with the scores they were based on. A student outside the session's school
or year groups, or not enrolled that year, returns 404.

See [the assessment results decision](docs/decisions/assessment-results.md)
for the model, the status and priority definitions and what was not
migrated.

The profile link carries the directory's current query, so the list behind
the dialog keeps its year, search, sort and page. Profile links are not
prefetched: prefetching on hover rendered the profile and directory early,
so one opening made six API requests instead of two.

## Authentication

The Express API owns accounts, sessions and authorisation. The Next.js
server signs in on the user's behalf, keeps the session token in an
`HttpOnly`, `Secure`, `SameSite=Lax` cookie and forwards it to the API as
a bearer token. The browser never calls the API, and browser JavaScript
cannot read the token.

`POST /auth/sessions` takes `email` and `password` and returns a token
and its expiry. `GET /auth/session` describes the signed-in user, active
school, role and year groups. `PUT /auth/session/organisation` switches to
another school where the user has an active membership and returns a new
token. `DELETE /auth/session` signs out. Every `/students` route requires
a valid bearer token.

Every protected request looks the session up by the SHA-256 digest of its
token and rejects it when it has expired (8 hours after sign-in), has been
revoked or belongs to a suspended membership. School, role and year
groups come only from that record; IDs or roles in the query string or
body are rejected or ignored. Headteachers see the whole school. Heads of
year and teachers see students placed in their assigned year groups for
the selected academic year, and nothing when no year group is assigned.

Five failed sign-ins for one email address within 15 minutes lock it for
30 minutes. Wrong passwords and unknown addresses get the same response.

The API refuses state-changing requests that carry browser `Origin` or
`Sec-Fetch-Site` headers, so a page on another site cannot use it
directly. Sign-in, sign-out and school switching run as Next.js Server
Actions, which accept only POST and reject requests whose `Origin` does
not match the host.

See [the authentication decision](docs/decisions/authentication-and-sessions.md)
for the alternatives considered and the limits.

## Verification

```bash
pnpm --filter @attainline/web lint
pnpm --filter @attainline/api test
pnpm typecheck
pnpm build
pnpm --filter @attainline/web test:e2e
```

Run PostgreSQL integration tests against a migrated local database named
`attainline_test`. They create and delete rows, so they refuse to run
when `DATABASE_URL` points at any other database or host:

```bash
DATABASE_URL="postgresql://attainline:local-development-only@127.0.0.1:5433/attainline_test" pnpm --filter @attainline/api test:integration
```

CI runs API checks against an isolated PostgreSQL service, then builds
the apps and runs the Playwright tests in Chromium. API tests generate
their own throwaway cursor keys, so CI needs no secret.

Next fetches the directory on the server, where browser request
interception cannot reach. The browser tests therefore start a small
stand-in HTTP API (`apps/web/tests/support/student-api-server.mts`) and
switch it between populated, empty, invalid-cursor and unavailable
responses. Both are held to the web app's response schema: the API
integration test parses real responses with it, and a stand-in response
that failed it would show the unavailable state and fail the populated
browser tests.

That contract check imports the web app's response schema and search
limit from the API's integration test only. API source cannot import
outside `apps/api/src` (`rootDir` in its `tsconfig.json`), and the API's
build and Docker image contain no web code.

The stand-in API keeps one global scenario and request log, so Playwright
runs with a single worker. Running tests in parallel would need
per-test isolation in the stand-in first.

For local Playwright Chromium installation:

```bash
pnpm --filter @attainline/web exec playwright install --with-deps chromium
```

Deployment workflows are not configured.
