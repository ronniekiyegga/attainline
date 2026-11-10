# Attainline

Attainline is a school assessment application for teachers, heads of year and
school leaders. It brings student placement, standardised assessment results
and shared performance indicators into one role-scoped workflow so staff can
identify cohort patterns, compare rankings and inspect the evidence behind an
individual student's status.

This repository is a standalone public implementation of those core workflows.
It uses independently generated school records, is not connected to the
original EduFeedbackPro deployment and is not hosted as a public application.

## Technology and boundaries

- **Web:** Next.js 16 App Router and React 19. Protected pages use React Server
  Components; dialogs, forms and keyboard interactions use Client Components.
- **API:** Express 5 routes delegate to controllers, services and Prisma
  repositories. Zod validates incoming requests and API responses.
- **Data:** PostgreSQL 18 and Prisma 7 store users, memberships, sessions,
  enrolments, assessment results, calendar events and notification read state.
- **Verification:** Node.js 24, TypeScript, Node's test runner, PostgreSQL
  integration tests and Playwright Chromium tests run in GitHub Actions.

Protected requests pass from Next.js to Express, where the session and active
school membership are verified before any data is read.

![Request and authorisation flow from the browser through Next.js and Express to organisation-scoped PostgreSQL queries](docs/readme-assets/architecture/request-authorisation-flow.svg)

Repositories add the active organisation and, for teachers and heads of year,
assigned year groups to every Prisma query. The same restrictions therefore
apply to the interface and direct API requests. This is application-enforced
query scoping rather than PostgreSQL Row-Level Security; the rationale and
session trade-offs are recorded in
[Authentication and sessions](docs/decisions/authentication-and-sessions.md).

## Dashboard and cohort analytics

Leaders can inspect whole-school patterns; teachers and heads of year see only
their assigned cohorts. The API loads the permitted cohort and applies the
shared `calculateStatus`, `calculatePriority` and `compareRankedScores` rules from
[`assessment.indicators.ts`](apps/api/src/features/assessments/assessment.indicators.ts).
Dashboard, profile and ranking views therefore use the same calculations.

Repositories select the latest sitting for each visible student and measure.
The analytics service calculates coverage, status and priority, then orders
rankings by score, surname and student ID before applying pagination. Web routes
render the returned contract on the server. Charts use CSS and SVG with text or
table equivalents, avoiding a client-side charting dependency.

![Attainline SLT and teacher dashboard with assessment widgets, calendar, ranking, notifications and student cards](docs/readme-assets/dashboard/slt-teacher-dashboard-overview.png)

![Assessment analytics comparing internal and external attainment by year group](docs/readme-assets/analytics/assessment-analytics.png)

![Classroom ranking comparison before and after an assessment](docs/readme-assets/analytics/classroom-ranking-comparison.png)

![Student data flowing through scoped queries and shared indicators to analytics, profiles and rankings](docs/readme-assets/architecture/student-data-analytics-flow.svg)

Integration tests send direct API requests across organisation and year-group
boundaries. Ranking responses are paginated, but the service still loads and
sorts the visible cohort to calculate global rank. The measured limit and a
database window-function alternative are documented in
[Analytics and rankings](docs/decisions/analytics-and-rankings.md) and
[Performance and complexity evidence](docs/performance.md).

## Student directory, search and pagination

Search runs in PostgreSQL before pagination, so it covers the full permitted
directory rather than only the rows loaded in the browser. Results use keyset
continuation ordered by surname and student ID instead of offset pagination.
The AES-256-GCM cursor is bound to organisation, academic year, sort direction
and a hash of the exact search term. The repository reapplies organisation and
year-group scope before pagination.

Academic year, search and sort are stored in the URL. Search covers first name,
surname and institution reference using escaped, case-insensitive substring
matching. The directory provides both face-card and detailed table views.

![Student directory face-card view with synthetic learner status](docs/readme-assets/students/student-directory-cards.png)

![Student directory table with synthetic priority, status, progress and activity data](docs/readme-assets/students/student-directory-table.png)

Integration tests cover case-insensitive search, literal wildcard input,
organisation isolation and cursor continuation. Keyset pagination provides
stable forward traversal but does not support arbitrary page jumps. The current
B-tree index supports scoped surname ordering, not arbitrary substring matching;
the measured query plan does not yet justify a trigram index.
See [Directory search](docs/decisions/student-directory-search.md) and
[Directory interactions](docs/decisions/student-directory-interactions.md).

## Student profile and assessment workflow

`assessment_results` stores one measure and sitting per row, with database
constraints for standard age score, stanine, percentile and raw-score scales.
The API returns the latest sitting in the selected academic year and the
previous sitting when one exists. This preserves each score's meaning instead
of combining different scales into a single number.

The Student Card uses a Next.js parallel route: it opens as a dialog from the
directory and as a full page when visited directly.

![Student Card assessment workflow over the Attainline dashboard](docs/readme-assets/dashboard/student-card-overlay.png)

Student details and assessments load concurrently on the server. The profile
shows the inputs used for status and priority and labels score differences as
changes rather than inferred progress.
Share, AI-summary, contact, assistant and next-student controls visible in the
design reference are not implemented in Attainline.

The API checks organisation and placement before reading assessment rows. This
adds a visibility lookup but prevents a browser-supplied student ID from
bypassing directory scope. The model and excluded heuristics are documented in
[Assessment results](docs/decisions/assessment-results.md).

## Calendar

Calendar routes reuse the active school membership and apply organisation and
year-group scope to date-range queries. Teachers and heads of year can remove
their own events; headteachers can manage events within the active school.

![Dashboard calendar with upcoming events and scheduled meetings](docs/readme-assets/dashboard/calendar.png)

![Weekly calendar view with synthetic events](docs/readme-assets/dashboard/weekly-calendar.png)

Unit and PostgreSQL integration tests cover validation, role scope,
cross-organisation access and deletion permissions. Events exist only in the
local synthetic database; there is no external calendar synchronisation.

## Notifications

Notifications are derived from the same analytics overview as the dashboard:
high-priority students, assessment coverage and off-track count. Read state is
stored per organisation membership, so switching schools does not carry it
across organisations.

<p align="center">
  <img src="docs/readme-assets/dashboard/notifications.png" width="420" alt="Attainline notification-panel presentation">
</p>

Service tests cover generated content and read state. The dashboard loads
notifications in parallel with its overview and calendar. There is no email,
push or external event provider.

## Command search and navigation

The command panel provides `Cmd/Ctrl+K`, local filtering and arrow/Enter
navigation across the fixed set of Attainline destinations. Student search
remains in the directory API rather than being duplicated in the client.

![Command navigation panel over the Attainline dashboard](docs/readme-assets/dashboard/command-panel-overlay.png)

The Radix dialog exposes a labelled combobox and listbox, moves focus to the
query when opened and supports Escape. It is navigation-only; exam, message,
announcement and onboarding search are not implemented.

## Testing and performance

The CI workflow installs the frozen lockfile, runs lint and TypeScript checks,
applies migrations to an isolated PostgreSQL 18 service, executes unit,
integration and browser tests, and builds both applications. It runs for pushes
to `main` and pull requests targeting `main`.

```mermaid
flowchart LR
  A([Locked install]) --> B([Lint + TypeScript]) --> C([API unit tests])
  C --> D([Migrate PostgreSQL 18]) --> E([Integration tests])
  E --> F([Production builds]) --> G([Playwright / Chromium])
```

| Layer | Result |
| --- | --- |
| API unit | 60 passing tests covering calculations, validation, sessions, cursors, calendar, notifications, seed safety and failures |
| PostgreSQL integration | 34 passing tests covering constraints, isolation, search, pagination, assessments, analytics, calendar events and notification state |
| Browser | 65 passing Playwright tests, including sign-in through sign-out and 390, 768, 1024 and 1440 px layouts |
| Static and production | Frontend lint, root type checks and both production builds passed on Node.js 24.19.0 during the release review |

Local PostgreSQL 18.6 plans used 67 synthetic students, 119 enrolments and 858
assessment results. Recorded execution times were 0.117 ms for the first
directory page, 0.123 ms for substring search, 0.107 ms for one student's
history and 0.251 ms for a cohort assessment read. These are warm local query
plans, not API or production response times.

The isolated in-process ranking calculation measured 0.084 ms median for 65
students and 5.735 ms median for 6,500 students over 30 runs. It excludes Prisma
materialisation, HTTP and validation. A separate local loopback browser sample
recorded 58.8 ms median for dashboard-to-rankings and 337.5 ms median for
directory-to-profile. Samples, p95 values, outliers, payload sizes, complexity
derivations and reproduction limits are in
[Performance and complexity evidence](docs/performance.md).

Failure-path tests cover cross-organisation access, disallowed year groups,
cursor replay under a changed context, missing or revoked sessions and database
readiness. CI is defined in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml); failure and recovery
notes are in
[Deployment recovery](docs/operations/deployment-recovery.md).

## Run locally

Requirements: Node.js 24, pnpm 12.8.1 and Docker with Compose.

```bash
git clone https://github.com/ronniekiyegga/edufeedback.git
cd edufeedback
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
openssl rand -base64 32 # copy into STUDENT_CURSOR_KEY in apps/api/.env
docker compose up -d --wait database
pnpm --filter @attainline/api exec prisma migrate deploy
SEED_DATABASE_URL="postgresql://attainline:local-development-only@127.0.0.1:5433/attainline" pnpm --filter @attainline/api seed:demo
```

Start `pnpm dev:api` and `pnpm dev:web` in separate terminals, then open
[http://localhost:3100/sign-in](http://localhost:3100/sign-in).

| Synthetic account | Scope |
| --- | --- |
| `morgan.vale@example.test` | Headteacher at both fictional schools |
| `rowan.thistle@example.test` | Head of Year 9 at Fictional Demo Academy |
| `sasha.wren@example.test` | Teacher for Years 7 and 8 at Fictional Demo Academy |

All three use the documented demo password `AttainlineDemo!2026`; role cards on
the sign-in page fill the selected synthetic credentials.

```bash
pnpm --filter @attainline/web lint
pnpm typecheck
pnpm --filter @attainline/api test
pnpm build
pnpm --filter @attainline/web test:e2e
```

PostgreSQL integration tests additionally require a migrated local database
named `attainline_test`; the test helper rejects any other database name.

## Material limitations

- Attainline is designed for synthetic data only and must not be used with real
  student records. Search terms and student IDs appear in URLs and may be
  retained by browser history or access logs.
- It is not publicly hosted and contains no provider-specific deployment
  configuration. Local Docker and GitHub Actions are the reproducibility path.
- Stateful sessions support immediate revocation, but OAuth, self-service
  accounts, password reset, MFA and audit-log infrastructure are outside scope.
- Attendance, QLA, file storage/upload, Export, external calendar
  synchronisation and ElevenLabs are not implemented. Screenshots may include
  those design references, but the controls are not active in Attainline.
- Rankings are calculated in application memory and substring search uses the
  current B-tree indexes. The recorded thresholds show when database-side
  ranking or trigram indexing should be reconsidered.

Further decisions on placement, directory state, assessments, sessions and
analytics are recorded in [`docs/decisions`](docs/decisions).
