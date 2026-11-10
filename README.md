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

- **Web:** Next.js 16 App Router and React 19. Protected reads run in React
  Server Components; small Client Components own dialogs, forms and keyboard
  interaction.
- **API:** Express 5 routes delegate to controllers, services and Prisma
  repositories. Zod schemas validate requests and responses at their
  boundaries.
- **Data:** PostgreSQL 18 and Prisma 7 store users, memberships, sessions,
  enrolments, assessment results, calendar events and notification read state.
- **Verification:** Node.js 24, TypeScript, Node's test runner, PostgreSQL
  integration tests and Playwright Chromium tests run in GitHub Actions.

The browser talks to Next.js. Next.js stores the opaque session token in an
`HttpOnly`, `Secure`, `SameSite=Lax` cookie and forwards it to Express. Express
reloads the session and active membership on every protected request; it is the
authentication and authorisation authority.

![Request and authorisation flow from the browser through Next.js and Express to organisation-scoped PostgreSQL queries](docs/readme-assets/architecture/request-authorisation-flow.svg)

Repositories add the active organisation and, for teachers and heads of year,
assigned year groups to the Prisma query before rows leave PostgreSQL. This
keeps direct API requests inside the same boundary as the interface. It is
application-enforced query scoping rather than PostgreSQL Row-Level Security;
every new repository read must therefore apply the same rule. The rationale and
session trade-offs are recorded in
[Authentication and sessions](docs/decisions/authentication-and-sessions.md).

## Dashboard and cohort analytics

**Problem.** Leaders need whole-school patterns while teachers and heads of year
must see only their assigned cohorts. Profiles, dashboards and rankings must not
reinterpret the same assessment differently.

**Engineering decision.** The API loads one selected, authorised cohort and
uses the shared `calculateStatus`, `calculatePriority` and
`compareRankedScores` rules from
[`assessment.indicators.ts`](apps/api/src/features/assessments/assessment.indicators.ts).
The web routes render the resulting contract on the server; role-aware views
change presentation, not access policy or calculations.

**How it works.** The repository selects the latest sitting for each visible
student and measure. The service aggregates coverage, status and priority,
then establishes a deterministic score–surname–ID order before slicing a
ranking page. Charts retain text and table equivalents and add no charting
dependency.

![Attainline SLT and teacher dashboard with assessment widgets, calendar, ranking, notifications and student cards](docs/readme-assets/dashboard/slt-teacher-dashboard-overview.png)

![Assessment analytics comparing internal and external attainment by year group](docs/readme-assets/analytics/assessment-analytics.png)

![Classroom ranking comparison before and after an assessment](docs/readme-assets/analytics/classroom-ranking-comparison.png)

![Student data flowing through scoped queries and shared indicators to analytics, profiles and rankings](docs/readme-assets/architecture/student-data-analytics-flow.svg)

**Evidence and trade-off.** Organisation and year-group restrictions are tested
through direct API requests. Ranking responses are paginated, but the service
still materialises and sorts the selected visible cohort to establish global
rank. That is appropriate for the documented synthetic workload, not a general
scale guarantee. The measured boundary and the database-window-function
alternative are documented in
[Analytics and rankings](docs/decisions/analytics-and-rankings.md) and
[Performance and complexity evidence](docs/performance.md).

## Student directory, search and pagination

**Problem.** A browser page contains only part of the directory. Client-side
filtering would miss students on later pages, while offset pagination can drift
under concurrent writes.

**Engineering decision.** Search runs inside the scoped PostgreSQL query before
pagination. Results use keyset continuation ordered by surname and student ID.
The AES-256-GCM cursor is bound to organisation, academic year, sort direction
and a hash of the exact search term; repository scope remains the authority.

**How it works.** Academic year, search and sort live in the URL. An explicit
search submission queries first name, surname and institution reference using
escaped, case-insensitive substring matching. The UI supports the face-card and
detailed table presentations shown below.

![Student directory face-card view with synthetic learner status](docs/readme-assets/students/student-directory-cards.png)

![Student directory table with synthetic priority, status, progress and activity data](docs/readme-assets/students/student-directory-table.png)

**Evidence and trade-off.** Integration tests cover case-insensitive search,
literal wildcard input, organisation isolation and continuation. Keyset cursors
provide stable forward traversal but no arbitrary page jump or snapshot. The
current B-tree index supports scoped surname ordering, not arbitrary substring
matching; trigram indexing is deferred until representative plans justify it.
See [Directory search](docs/decisions/student-directory-search.md) and
[Directory interactions](docs/decisions/student-directory-interactions.md).

## Student profile and assessment workflow

**Problem.** Staff need the result behind a status without collapsing standard
age score, stanine, percentile and raw-score scales into one number.

**Engineering decision.** `assessment_results` stores one measure and sitting
per row with database constraints for each scale. The API returns the latest
sitting in the selected academic year and, when present, the previous sitting.
The Student Card is a server-rendered parallel-route dialog over the directory;
opening the same URL directly produces a page.

![Student Card assessment workflow over the Attainline dashboard](docs/readme-assets/dashboard/student-card-overlay.png)

**How it works.** Student details and assessments load concurrently through the
Next.js server boundary. The profile reports the shared status and priority
inputs and labels score differences as changes rather than inferred progress.
Share, AI-summary, contact, assistant and next-student affordances visible in
the design reference are outside the implemented Attainline workflow.

**Evidence and trade-off.** Organisation and placement checks run before any
assessment row is read. This repeats a visibility lookup, intentionally avoiding
an assessment endpoint that trusts a student ID supplied by the browser. The
model and deliberately excluded heuristics are documented in
[Assessment results](docs/decisions/assessment-results.md).

## Calendar

**Problem.** Dashboard events must respect the same school and year-group scope
as assessment data instead of becoming a separate unguarded store.

**Engineering decision.** Calendar routes use the existing session membership.
Repositories scope range queries by organisation and permitted year groups;
teachers and heads of year can remove their own events, while headteachers can
manage events within the active school.

![Dashboard calendar with upcoming events and scheduled meetings](docs/readme-assets/dashboard/calendar.png)

![Weekly calendar view with synthetic events](docs/readme-assets/dashboard/weekly-calendar.png)

**Evidence and trade-off.** Unit and PostgreSQL integration tests cover event
validation, role scope, cross-organisation access and deletion permissions.
External calendar synchronisation is deliberately absent; events exist only in
Attainline's synthetic demonstration database.

## Notifications

**Problem.** Staff need current assessment signals without a separate feed that
can disagree with the analytics calculation.

**Engineering decision.** The notification service derives three entries from
the authorised analytics overview—high priority, assessment coverage and
off-track count—and stores read state per organisation membership.

<p align="center">
  <img src="docs/readme-assets/dashboard/notifications.png" width="420" alt="Attainline notification-panel presentation">
</p>

**Evidence and trade-off.** Service tests cover derived content and read state;
the dashboard loads notifications in parallel with its overview and calendar.
The panel image shows the approved presentation, while runtime entries are the
assessment-derived synthetic signals described above. There is no email, push
or external event provider.

## Command search and navigation

**Problem.** The main data views need keyboard access without introducing a
second data-search implementation.

**Engineering decision.** A focused Client Component owns `Cmd/Ctrl+K`, local
filter state and arrow/Enter navigation. It searches the fixed set of available
Attainline destinations; student search remains in the scoped directory API.

![Command navigation panel over the Attainline dashboard](docs/readme-assets/dashboard/command-panel-overlay.png)

**Evidence and trade-off.** The Radix dialog exposes a labelled combobox and
listbox, moves focus to the query on open and supports Escape. It is intentionally
navigation-only: the broader exam, message, announcement and onboarding items
visible in the design reference are not implemented features.

## Verification and measured boundaries

The CI workflow installs the frozen lockfile, lints the web app, checks the
monorepo TypeScript build, runs API unit tests, applies migrations to an isolated
PostgreSQL 18 service, runs database integration tests, builds both applications
and exercises Chromium. CI runs for `main` pushes and pull requests targeting
`main`; a feature-branch push alone does not claim a passing GitHub Actions run.

```mermaid
flowchart LR
  A([Locked install]) --> B([Lint + TypeScript]) --> C([API unit tests])
  C --> D([Migrate PostgreSQL 18]) --> E([Integration tests])
  E --> F([Production builds]) --> G([Playwright / Chromium])
```

| Layer | Release evidence |
| --- | --- |
| API unit | 60 passing tests covering calculations, validation, sessions, cursors, calendar, notifications, seed safety and failures |
| PostgreSQL integration | 34 passing tests covering constraints, isolation, search, pagination, assessments, analytics, calendar events and notification state |
| Browser | 65 passing Playwright tests, including sign-in through sign-out and 390, 768, 1024 and 1440 px layouts |
| Static and production | Frontend lint, root type checks and both production builds passed on Node.js 24.19.0 during the release review |

Local PostgreSQL 18.6 plans used 67 synthetic students, 119 enrolments and 858
assessment results. The current recorded plans are 0.117 ms for the first
directory page, 0.123 ms for substring search, 0.107 ms for one student's
history and 0.251 ms for the cohort assessment read. These are warm local query
plans—not API response times, public-network timings or production evidence.

The isolated in-process ranking calculation measured 0.084 ms median for 65
students and 5.735 ms median for 6,500 students over 30 runs. It excludes Prisma
materialisation, HTTP and validation. A separate local loopback browser sample
recorded 58.8 ms median for dashboard-to-rankings and 337.5 ms median for
directory-to-profile. Samples, p95 values, outliers, payload sizes, complexity
derivations and reproduction limits are in
[Performance and complexity evidence](docs/performance.md).

Representative failure-path tests cover cross-organisation access, disallowed
year groups, cursor replay under a changed context, missing or revoked sessions,
database readiness and safe feature failures. CI is defined in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml); recovery reasoning is in
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

- Attainline is not authorised to process real student data. Search terms and
  student IDs appear in URLs and may be retained by browser history or access
  logs.
- It is not publicly hosted and contains no provider-specific deployment
  configuration. Local Docker and GitHub Actions are the reproducibility path.
- Stateful sessions support immediate revocation, but OAuth, self-service
  accounts, password reset, MFA and audit-log infrastructure are outside scope.
- Attendance, QLA, file storage/upload, Export, external calendar
  synchronisation and ElevenLabs are not implemented. No screenshot should be
  read as evidence that those controls operate.
- The global-ranking memory boundary and substring-search plan are sufficient
  only for the documented synthetic workload; the measured thresholds above
  identify when database-side ranking or trigram indexing should be reconsidered.

Further decisions are recorded in [`docs/decisions`](docs/decisions), including
annual placement, directory interaction state, assessment modelling,
authentication and analytics boundaries.
