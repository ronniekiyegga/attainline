# Attainline

Attainline is a full-stack school assessment analytics application for teachers,
heads of year and headteachers. It turns enrolment and standardised assessment
records into role-scoped dashboards, rankings, a student directory and profiles.
The public repository supports independently invented demo data only.

## What it does

- Gives teachers and heads of year dashboard and directory views restricted to their assigned year groups.
- Gives headteachers whole-school analytics and supports switching between active school memberships.
- Presents CAT4, NGRT and Progress Test results without collapsing their standard age score, stanine, percentile and raw-score scales.
- Calculates one shared set of status, priority and ranking rules for student profiles, dashboards and rankings.
- Keeps directory search, sorting, academic year and pagination in the URL so views survive refresh and can be shared within the demo.

## Product views

The visuals below are the approved EduFeedbackPro presentation reference. The
public Attainline build keeps its assessment and access-control architecture while
excluding integrations that are outside the repository's stated scope.

### SLT & Teacher dashboard

![SLT and teacher dashboard with performance cards, calendar, ranking, updates and student face cards](docs/readme-assets/dashboard/slt-teacher-dashboard-overview.webp)

| Student Card | File Uploader |
| --- | --- |
| ![Student Card showing a synthetic learner's status and assessment reports](docs/readme-assets/dashboard/student-card-modal.webp) | ![File Uploader design with drop zone and assessment folders](docs/readme-assets/dashboard/file-uploader-modal.webp) |

| Command | Ranking component |
| --- | --- |
| ![Command panel for finding learning resources and announcements](docs/readme-assets/dashboard/command-panel.webp) | ![Circular ranking component placing a synthetic student result in cohort context](docs/readme-assets/analytics/ranking-circular.webp) |

The Student Card and ranking views inform the migrated workflows. File upload,
command and legacy assistant affordances visible in the source artwork are not
enabled in this public build.

### Assessment analytics

![Year-group attainment analytics comparing internal and external assessment results](docs/readme-assets/analytics/year-group-attainment.png)

## Architecture

The browser talks only to Next.js. Server Components load protected data, and
Server Actions handle sign-in, sign-out and school switching. Next.js keeps the
opaque session token in an `HttpOnly` cookie; Express remains the authentication
and authorisation authority.

![Request and authorisation flow from the browser through Next.js and Express to scoped PostgreSQL queries](docs/readme-assets/architecture/request-authorisation-flow.svg)

The API is organised by feature. Routes define endpoints and middleware, controllers validate HTTP input, services own use cases and calculations, and repositories own Prisma queries. PostgreSQL constraints reinforce organisation, membership, enrolment, session and assessment relationships.

## Engineering decisions

### 1. Scope reads before rows leave PostgreSQL

**Problem and constraints.** One account can belong to several schools, while
teachers and heads of year may see only assigned year groups. The API must hold
that boundary even when it is called without the Next.js interface.

**Alternatives.** Fetching a broad cohort and filtering in application code
would make one missed filter a data disclosure. PostgreSQL Row-Level Security
(RLS) could add a database-enforced boundary, but would require transaction-local
identity context, policies and tests alongside Prisma's connection pooling.

**Decision and evidence.** Express reloads the stored session and active
membership on every protected request. Repositories then include its school and
year-group scope in the query itself. This is the actual directory query:

```ts
const conditions: Prisma.StudentWhereInput[] = [
  { enrolments: { some: visibleEnrolment(access, academicYearStart) } },
];

if (search) {
  conditions.push(matchesSearch(search));
}

if (after) {
  conditions.push(isAfter(after, direction));
}

const students = await database.$transaction(
  (transaction) => transaction.student.findMany({
    where: { organisationId: access.organisationId, AND: conditions },
    select: placementSelect(access, academicYearStart),
    orderBy: [{ surname: direction }, { id: direction }],
    take: limit + 1,
  }),
  { isolationLevel: "RepeatableRead" },
);
```

The enrolment predicate adds `yearGroup: { in: access.yearGroups }` for scoped
roles. See the [directory repository](apps/api/src/features/students/student.repository.ts#L64-L71),
[query](apps/api/src/features/students/student.repository.ts#L112-L150) and
[cross-organisation integration test](apps/api/tests/auth.integration.test.ts#L370-L397).

**Trade-off.** This is application-enforced query scoping, not RLS: every new
repository read must apply the same rule. RLS would provide useful defence in
depth before processing real student data, but adds operational context and
policy-migration complexity that the synthetic demonstration does not currently
carry. Stateful sessions also add one database lookup per protected request,
while making revocation, expiry and membership suspension effective immediately.
See [Authentication and sessions](docs/decisions/authentication-and-sessions.md).

### 2. Use context-bound keyset cursors

**Problem.** Offset pages can drift as rows are inserted or removed, and a bare
surname/ID cursor would expose stable record details in the URL.

| Option | Strength | Cost |
| --- | --- | --- |
| Offset (`page=10`) | Arbitrary page jumps | Later pages scan/skip more rows and can shift under writes |
| Keyset (`after=surname,id`) | Continues from a stable, indexed order | Forward navigation only; no arbitrary page jump |

**Decision.** The directory orders by surname, then ID as a unique tie-breaker,
fetches `limit + 1`, and continues after the final visible row. AES-256-GCM
encrypts and authenticates the cursor. The decoded payload is separately bound
to organisation, academic year, sort direction and the exact search hash:

```ts
if (
  cursor &&
  (cursor.organisationId !== access.organisationId ||
    cursor.academicYearStart !== academicYearStart ||
    cursor.sort !== sort ||
    cursor.searchHash !== boundSearch)
) {
  return { status: "invalid-cursor" } as const;
}
```

See the [context check](apps/api/src/features/students/student.service.ts#L25-L35),
[AES-GCM codec](apps/api/src/features/students/student.cursor.ts#L101-L144) and
[replay tests](apps/api/tests/students.routes.test.ts#L325-L362).

**Trade-off.** Encryption prevents reading and undetected editing of the payload;
it is not authorisation. Repository scope remains authoritative. Results are not
a snapshot: a surname edit can move a row between requests, and the interface
cannot jump directly to page 10. See [Student directory search](docs/decisions/student-directory-search.md).

### 3. Search the scoped dataset, not the loaded page

**Problem.** The browser holds one directory page, so client filtering would
silently omit matching students on later pages.

| Alternative | Decision boundary |
| --- | --- |
| Client filtering | Rejected: incomplete over a paginated dataset |
| PostgreSQL substring search | Selected: one scoped query and no indexing pipeline |
| Separate search service | Deferred: adds deployment, synchronisation and failure modes without measured need |

Prisma applies escaped, case-insensitive `contains` predicates for first name,
surname and institution reference before keyset pagination. Search submission is
explicit rather than request-per-keystroke. The current B-tree index supports the
organisation/surname order, not arbitrary substring matching; there is no
established search-latency or scale result. PostgreSQL trigram indexing is the
next option if measurements justify it. See the [search predicate](apps/api/src/features/students/student.repository.ts#L28-L48)
and [PostgreSQL search tests](apps/api/tests/students.integration.test.ts#L274-L359).

### 4. Keep protected reads in Server Components

**Problem and alternatives.** Fetching directly from the browser to Express
after hydration would send an empty shell first and require browser-held API
credentials. A hydrated client could instead call a Next.js route that keeps the
token and validation server-side, but adds another HTTP hop plus client loading
and cache ownership. A client cache could improve repeated reads, while becoming
another owner for authenticated state.

**Decision and evidence.** Dashboard, analytics, rankings, directory and profile
routes fetch in React Server Components. The Next.js boundary holds the token,
uses `cache: "no-store"`, validates Express responses with feature-level Zod
schemas and maps failures to explicit states. Client Components are reserved for
interaction. Year, search, sort and cursor state live in the URL. Independent
requests use `Promise.all` where possible—for example session/year resolution
and profile details/assessments—while the dashboard overview waits for the
validated year it needs. See the [API boundary](apps/web/src/server/attainline-api.ts#L85-L152),
[dashboard composition](apps/web/src/app/%28dashboard%29/dashboard/page.tsx#L23-L66)
and [directory orchestration](apps/web/src/features/students/student-directory.tsx#L34-L93).

**Trade-off.** Protected navigation performs fresh server work and deliberately
does not share data through a persistent browser cache. Suspense supplies route
loading states, but there is still a dependent overview request after the year
is resolved. Browser tests exercise the server-rendered contract with a stand-in
API; PostgreSQL integration tests exercise Express and Prisma.

### 5. Share indicator rules and rank in the API

![Student data and analytics flow from scoped records through shared indicators to profiles, dashboards and rankings](docs/readme-assets/architecture/student-data-analytics-flow.svg)

**Problem.** Browser-side aggregation would ship an oversized cohort and allow
profiles and dashboards to calculate different results. Database window
functions could rank efficiently, while maintained aggregates could make reads
cheap, but both increase query or invalidation complexity.

**Decision and evidence.** The API loads only visible cohort fields, selects the
latest sitting per measure, and calls the same `calculateStatus`,
`calculatePriority` and `compareRankedScores` functions used by student
assessments. It applies deterministic score–surname–ID ordering before slicing
the requested ranking page. See the [shared indicators](apps/api/src/features/assessments/assessment.indicators.ts#L28-L74),
[analytics service](apps/api/src/features/analytics/analytics.service.ts#L146-L217)
and [ranking unit test](apps/api/tests/analytics.test.ts#L73-L100).

**Trade-off.** The response is paginated, but global rank still loads and sorts
the selected visible cohort in API memory. That boundary is acceptable for the
65-student demonstration, not a general scale claim. A larger measured workload
should move latest-result selection and ranking to PostgreSQL window functions;
maintained aggregates are warranted only when read volume offsets their write and
rebuild complexity. See [Analytics and rankings](docs/decisions/analytics-and-rankings.md)
and [Assessment results](docs/decisions/assessment-results.md).

An earlier release review recorded the following local PostgreSQL 18 and
service measurements against the synthetic fixture. They establish the current
demonstration boundary; they are not production-scale claims.

| Path | Measured local result |
| --- | --- |
| Directory page | 0.139 ms execution plan using the organisation/surname/ID index |
| Substring search | 0.098 ms execution plan over the small scoped fixture |
| Cohort and assessment read | 0.407 ms for 361 rows; 53 kB sort memory |
| Ranking service | 30 warm runs over 61 visible students: 2.885 ms median, 4.121 ms p95, 5.616 ms maximum; 2,478-byte page response |

See [Performance and complexity evidence](docs/performance.md) for complexity
derivations, current query plans, scaled ranking measurements, frontend timings
and the limits of comparison between them.

## Verification

The single CI job is fail-fast by step: any failed install, lint, type check,
unit test, migration, integration test, production build or Chromium test keeps
the commit from passing. PostgreSQL 18 runs as an isolated service and migrations
are applied before database tests.

```mermaid
flowchart LR
  A([Locked install]) --> B([Lint + TypeScript]) --> C([API unit tests])
  C --> D([Migrate PostgreSQL 18]) --> E([Integration tests])
  E --> F([Production builds]) --> G([Playwright / Chromium])
```

| Layer | Evidence from the release review |
| --- | --- |
| API unit tests | 53 passing tests for calculations, validation, sessions, cursors, seed safety and error handling |
| PostgreSQL integration | 33 passing tests for constraints, isolation, search, pagination, assessments and analytics |
| Browser | 63 passing Playwright tests, including full-stack readiness, the complete signed-in journey and 390, 768, 1024 and 1440 px layouts |
| Static and production | Frontend lint, root TypeScript checks and both production builds passed on Node.js 24.19.0 |
| CI | GitHub Actions installs the frozen lockfile, migrates an isolated PostgreSQL service, runs all checks and builds, then runs Chromium tests |

CI is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
The repository does not provision or claim a public Attainline deployment.
Reproducibility is provided by the local Docker, PostgreSQL, Next.js and Express
workflow below, with verification enforced by GitHub Actions.

### Failure-path evidence

| Attempted operation | Expected behaviour | Evidence |
| --- | --- | --- |
| Read a student from another organisation or forge an organisation header | `404`, or the active school's rows only | [Organisation isolation](apps/api/tests/auth.integration.test.ts#L370-L397) |
| Read outside an assigned year group | Directory/profile hide the row; disallowed analytics filter returns `403` | [Role scope](apps/api/tests/auth.integration.test.ts#L399-L426), [analytics scope](apps/api/tests/analytics.integration.test.ts#L62-L88) |
| Reuse a cursor with another search, year or sort | `400 Invalid pagination`; repository query is not called | [Cursor context](apps/api/tests/students.routes.test.ts#L325-L362) |
| Call protected APIs without a bearer session | `401 Authentication required` before student data | [Missing/invalid session](apps/api/tests/auth.integration.test.ts#L316-L341) |
| Reuse a signed-out, expired or suspended session | `401` on the next protected request | [Session termination](apps/api/tests/auth.integration.test.ts#L343-L368) |
| Lose the database or receive an API failure | Readiness or feature returns `503`; logs keep a request ID and omit private error text | [Readiness failure](apps/api/tests/readiness.test.ts#L35-L58), [safe feature failure](apps/api/tests/students.routes.test.ts#L246-L286) |

### Operational boundaries

Attainline exposes structured JSON errors, propagated request IDs, API liveness
and database readiness checks. The web `/health` route verifies the API `/ready`
boundary and returns `503` when the dependency is unavailable or exceeds its
bounded timeout. A portable Playwright smoke journey can exercise an explicitly
supplied target without encoding a hosting provider.

No external log collector, retention policy or alerting service is configured.
The [recovery procedure](docs/operations/deployment-recovery.md) separates
application rollback from forward database recovery and prohibits using the
synthetic seed as a general repair mechanism.

## Running locally

Requirements: Node.js 24, pnpm 12.8.1 and Docker with Compose.

```bash
git clone https://github.com/ronniekiyegga/edufeedback.git
cd edufeedback
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
openssl rand -base64 32
```

Paste the generated value into `STUDENT_CURSOR_KEY` in `apps/api/.env`.
The example environment files already target the local ports below.

```bash
docker compose up -d --wait database
pnpm --filter @attainline/api exec prisma migrate deploy
SEED_DATABASE_URL="postgresql://attainline:local-development-only@127.0.0.1:5433/attainline" pnpm --filter @attainline/api seed:demo
```

Start the API and web app in separate terminals:

```bash
pnpm dev:api
```

```bash
pnpm dev:web
```

Open [http://localhost:3100/sign-in](http://localhost:3100/sign-in).

| Demo account | Scope |
| --- | --- |
| `morgan.vale@example.test` | Headteacher at both fictional schools |
| `rowan.thistle@example.test` | Head of Year 9 at Fictional Demo Academy |
| `sasha.wren@example.test` | Teacher for Years 7 and 8 at Fictional Demo Academy |

All three use `AttainlineDemo!2026`; the sign-in role cards fill the matching
synthetic credentials.

Run the standard checks with:

```bash
pnpm --filter @attainline/web lint
pnpm typecheck
pnpm --filter @attainline/api test
DATABASE_URL="postgresql://attainline:local-development-only@127.0.0.1:5433/attainline_test" pnpm --filter @attainline/api test:integration
pnpm build
pnpm --filter @attainline/web test:e2e
```

Against an explicitly supplied running target, run the synthetic-only smoke
journey with:

```bash
DEMO_BASE_URL="https://<target-host>" pnpm --filter @attainline/web test:smoke
```

The integration database must be local, named `attainline_test`, and migrated
before the integration command runs.

## Limitations

- Attainline is a synthetic demonstration and is not authorised to process real student data. Search terms and student IDs appear in URLs and may be retained by browser history or infrastructure access logs.
- Substring search uses PostgreSQL without a trigram index; no search-latency or scale claim has been established.
- Global ranking work is bounded by the visible school cohort, not by the page size. Database-side ranking is the next scaling boundary if measurements justify it.
- OAuth, self-service accounts, password reset, MFA, audit logs, attendance, notifications, QLA and external calendar integrations are outside this build.

Detailed records live in [`docs/decisions`](docs/decisions), including annual
placements, directory interactions, assessment modelling, authentication and
analytics boundaries.
