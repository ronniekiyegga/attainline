# Development journal

## 2026-10-21: Application foundation and API container

Established a pnpm workspace containing a Next.js frontend and an Express
API. Application setup is separate from the API's network listener.

The API image uses a multi-stage build. TypeScript compilation happens
in the build stage; the runtime receives compiled code and production
dependencies and runs as a non-root user.

### Installation failure

The first container installation failed with ERR_PNPM_IGNORED_BUILDS.
The lockfile was valid, but esbuild's installation script had not been
explicitly permitted.

Added a version-specific build permission for esbuild 0.28.2, retaining
the existing denials for sharp and unrs-resolver. Frozen-lockfile
installation remains enabled.

### Verification

- Docker image built successfully.
- Compose reported the API container healthy.
- GET http://localhost:4101/health returned HTTP 200 and {"status":"ok"}.

These checks establish API HTTP liveness, not database readiness.
Automated application tests and the frontend container are not yet added.
The GitHub Actions workflow has not yet been verified on GitHub.

## Student data foundation

Separated organisation ownership, student identity and annual enrolment.

A composite foreign key prevents enrolments from referencing a student
in another organisation. Student references are unique within their
organisation. Check constraints reject blank required values and
nonpositive year groups.

Local PostgreSQL tests verified cross-organisation enrolment rejection,
duplicate reference rejection, invalid year-group rejection and
restricted organisation deletion.

The deletion test initially expected foreign_key_violation, but PostgreSQL
raised restrict_violation. Corrected the test handler without changing
the database restriction; the rerun passed and rolled back its changes.

These tests establish the exercised database constraints, not API
authorisation or complete tenant isolation.

## Database connectivity and readiness

Added a shared Prisma client using the PostgreSQL adapter, with an
explicit pool limit and connection/query timeouts.

Kept process liveness (`/health`) separate from database readiness
(`/ready`). Readiness returns HTTP 503 when the database check fails,
without exposing connection details.

Manual HTTP checks returned 200 for both endpoints. Readiness executes
`SELECT 1`; it does not verify application tables or tenant isolation.

Added HTTP tests covering readiness success, database failure and
continued liveness during a database outage.

## Encrypted pagination cursors

Finding: cursors were base64url-encoded JSON. Decoding one revealed the
student's surname, ID and organisation ID. The directory UI being
migrated puts cursors in page URLs, so children's surnames would reach
browser history, server logs and shared links.

Decision: encrypt cursors with AES-256-GCM using Node's built-in crypto.
Each token carries a version byte, authenticated as additional data, and
a fresh 12-byte nonce. The decrypted payload is validated again before
use. Altered, malformed or foreign-key tokens all return the same 400.
The key comes from `STUDENT_CURSOR_KEY` and is validated at startup.

Rejected alternatives:

- An ID-only cursor needs a lookup to recover the surname. It also stops
  working when the student it points at is deleted, which the keyset
  design otherwise tolerates.
- A signed but unencrypted cursor prevents tampering but still exposes
  the surname.

Limits:

- Encryption is not authorisation. Queries remain scoped to the server's
  organisation, and a cursor issued for another organisation is
  rejected.
- Rotating the key invalidates issued cursors; there is no key ID yet.
- At first, surname length was unbounded, so a very long surname could
  exceed the cursor length limit. Resolved below.

## Surname bound and database constraint tests

The cursor length limit was a fixed 8,192 characters while surnames were
unbounded, so a long enough surname would produce a page link the API
rejects. Surnames are now `VARCHAR(100)`, and the cursor limit is
calculated from that bound. `JSON.stringify` writes at most 6 bytes per
code point, so a surname of 100 control characters gives the longest
possible token: exactly 991 characters. Unit and integration tests cover
that case and confirm the database rejects 101 characters. PostgreSQL
counts code points, so the cursor payload check counts code points too,
not UTF-16 units.

The database constraint checks lived in a SQL script that was never run
automatically and relied on demo seed rows. They are now an integration
test with its own fixtures, run in CI. Writing it showed that check and
`RESTRICT` violations reach the application as a raw `DriverAdapterError`
with the PostgreSQL code at `cause`, not under `meta`. The error
classifier read only `meta`, so those failures would have been logged
with no code. It now reads both shapes.

## Dashboard shell migration

Migrated the teacher dashboard shell presentation (sidebar dimensions,
collapsed icon rail, header trigger and mobile navigation dialog)
without auth, membership or AI/calendar dependencies. Synthetic identity
and school name props stand in for session and tenant context.

Decision: keep `defaultOpen={false}` to match the original teacher
layout, so the icon rail is the default desktop state.

Leaving the mobile layout unmounts the navigation sheet, so the provider
resets its open state when the breakpoint changes; otherwise the sheet
would reopen unprompted on the next return to mobile width.

Finding: the mobile navigation is a controlled Radix dialog opened by a
trigger outside `Dialog.Root`, so closing it did not return focus to the
trigger. Explicit `onOpenAutoFocus` and `onCloseAutoFocus` handlers now
move focus to the close control and back. Removing the close handler
makes both Playwright focus-return checks fail.

`/students` returned 503 during manual testing. The cause was not
investigated and is unknown. The directory shows its unavailable state
for any failed or non-OK response, and its empty state only for a
successful empty page; browser tests cover both.

## Directory navigation and browser tests

The directory used plain anchors with the Next.js link lint rule
disabled. The stated reason was that pagination should work without
client JavaScript. A check with JavaScript disabled showed the directory
never leaves its Suspense loading state, whichever link type is used:
Next streams that content and needs JavaScript to reveal it. The
suppression was removed and the links now use `next/link`. A Playwright
test confirms pagination is client-side by checking that the expanded
sidebar survives a page change, then checks refresh and the return to
the first page. Rendering without JavaScript is not supported.

Next fetches the directory on the server, so browser request
interception cannot control it. The browser tests run a small stand-in
HTTP API with populated, empty, invalid-cursor and unavailable
scenarios. It also records the requests it receives, which lets the
tests assert the page size and that the web app sends a request ID.

Finding: generating the request ID with `randomUUID()` made Next report
a prerendering error under `cacheComponents`. The directory fetch now
calls `connection()` first, marking it as request-time work.

## 2026-11-09: Directory interactions and student details

Added an allowlisted surname sort to the Express contract and encrypted
cursor payload. Both surname and ID reverse together, which preserves a stable
keyset order for repeated surnames. Added a tenant-and-year-constrained detail
lookup that returns the same six fields as a directory row.

The browser keeps filters and pagination in the URL, while optional-column
visibility remains local presentation state. Refresh re-renders the current
server route without discarding that state. Student details load through a
Next.js route handler so the upstream API address stays server-only; the proxy
validates and strips its response before returning it to the browser. Detail
requests are keyed by selection and aborted on change, preventing an older
response from replacing the current student.

The private reference used text colours below WCAG AA contrast. Attainline
keeps its gradient treatment but uses a darker card and lighter labels; the
worst measured pair is 5.16:1. Refresh and loading animations stop under
reduced-motion preferences.

Running the constraint suite against local PostgreSQL 18 exposed a newer
Prisma adapter shape: wrapped foreign-key errors carry SQLSTATE in
`originalCode`. The safe classifier now accepts `code` or `originalCode`
without reading/logging the accompanying database message. The delete
restriction reports Prisma `P2003`, adapter kind
`ForeignKeyConstraintViolation` and PostgreSQL `23503`; the integration test
asserts all three.

### Verification

- API unit suite: 36 tests passed.
- Frontend lint, workspace typecheck and both production builds passed.
- Playwright: 46 tests passed across desktop and phone layouts, keyboard and
  focus flows, loading/error/retry states, response races, reduced motion and
  presentation checks.
- PostgreSQL integration suite: 16 tests passed against an isolated local
  `attainline_test` database after applying both migrations.

## 2026-11-09: Row-backed details and concurrent directory requests

Review finding: the details dialog fetched, through a Next.js proxy, the
same six fields as the row it was opened from. The request could fail and
show "unavailable" for data already on screen, and the abort, retry and
race handling existed only to protect that request. The dialog now renders
the row; the proxy route and client fetch are removed. The API's detail
endpoint is kept for the server-rendered student profile.

The directory fetched the year list and then the selected year's page.
When the URL names a year the two requests are independent, so they now
run together. The stand-in API can hold the year list until a list request
arrives; a browser test opening `/?year=2025` passes with concurrent
requests and fails when the requests are made one after the other. The
invalid-year test now checks that no table is shown instead of that no
list request was made, because that request is now sent and discarded.

Considered lowering the web app's 25 s upstream timeout. Kept it: the API
can wait up to 15 s for a pool connection and 5 s for a statement, so a
shorter web timeout would replace the API's 503 with a web-side timeout.

### Verification

- Playwright: 42 tests passed after rebuilding the web app. The six tests
  for detail loading, retry, races and the proxy were removed with that
  code; one test checks the dialog makes no request, and one checks the
  concurrent requests.
- API unit suite: 36 passed. PostgreSQL integration suite: 16 passed.
- Frontend lint, workspace typecheck and both production builds passed.

## 2026-11-09: Staff authentication and scoped access

Replaced the configured demo organisation with staff sign-in. Express owns
users, memberships, year-group assignments, sessions and the sign-in
throttle; the web app holds the token in an HttpOnly cookie and forwards it
as a bearer token. The decision, alternatives and limits are in
`docs/decisions/authentication-and-sessions.md`.

Student queries now take an access scope from the session instead of an
organisation ID, so the school and year-group restriction is part of each
query's `WHERE` clause rather than a filter applied afterwards.

Finding: with Cache Components enabled, reading the session at the top of
the dashboard layout and of the sign-in page failed the production build
("uncached or runtime data during prerendering"). Awaiting the session in
the layout would also have held the page's own API requests behind it. The
session is now read in an account panel and a sign-in redirect check, each
behind its own Suspense boundary, and both routes build as partial
prerenders.

Finding: deliberately breaking each control and rerunning the suite showed
two untested paths. A session revoked between authentication and a school
switch could be replaced, and `GET /auth/session` could report the wrong
role without failing a test. Both now have tests that fail when the code is
broken that way. The other mutations tried (ignoring expiry, revocation,
suspension, year groups or the organisation filter; skipping the password
check; never locking; never resetting the failure window; allowing browser
mutations; keeping the old token on rotation; a script-readable cookie;
sign-out without server revocation) each failed at least one test.

Review finding: the auth route handlers held the sign-in use case
(lockout, password check, failure recording, membership choice, session
issue), and the repository held policy such as token generation, lifetime
and the response shape. Both features now separate a router, controller,
service and repository. The student directory's cursor binding moved from
its route handler into its service. The test suites pass unchanged in
behaviour, and the deliberate breakages below were repeated against the
new layout.

The first sign-in page was a generic form. It was rebuilt from
EduFeedbackPro's markup and compared with the original rendered locally
with every external service disabled. Computed styles and element
screenshots matched once two differences were fixed: role-card wrappers
that collapsed margins (cards 128 px instead of 135 px), and Tailwind 4's
blue and violet scales and oklab gradient interpolation. `globals.css` now
pins those scales to their Tailwind 3 values and the button gradient
interpolates in sRGB. Rebuilding with the original zinc-400 text gave 0
differing pixels for the header and cards, so the remaining differences
come only from the contrast change.

### Verification

- API unit suite: 41 passed. PostgreSQL integration suite: 29 passed,
  13 of them for authentication, scoping and sign-in throttling, calling
  Express directly without the web app.
- Playwright: 50 passed, including sign-in, rejected and locked sign-in,
  demo account selection, sign-in measurements at desktop and phone widths,
  sign-out with server revocation, a session ending during use, school
  switching with token rotation, and checks that the cookie is HttpOnly
  and that the browser never calls the API.
- The migration applies cleanly, and `prisma migrate diff` against the
  migrated database reports no drift.
- Frontend lint, workspace typecheck and both production builds passed.

## 2026-11-09: Student profiles and assessment results

Added `assessment_results` with one row per student, measure and sitting,
replacing EduFeedbackPro's wide score columns, and a scoped
`GET /students/:id/assessments` endpoint. Status and priority keep the
original definitions and return the scores they used. The decision and
what was left out, including the original risk heuristic, are in
`docs/decisions/assessment-results.md`. Simple student reads now go from
controller to repository; the student service keeps only the directory
use case, where cursor rules live.

The profile replaces the row-backed dialog with an intercepted
`/students/<id>` route rendered on the server, using the original "Student
Portfolio" layout.

Finding: the first profile link carried only `?year=`. Opening it
re-rendered the directory behind the dialog with that query, so a
directory on its second page or with a search was reset underneath the
profile. Links now carry the directory's whole query. A browser test opens
a profile from `/?year=2026&cursor=page-2`, closes it, and checks the URL,
rows and that no list request was made; it fails with the old link.

Finding: opening one profile made six API requests (the profile twice and
the directory once) instead of two. Hovering the link prefetched the
dynamic route, rendering the profile and directory before the click.
With `prefetch={false}` on profile links, a probe measured two requests
per opening and none on hover. Restoring prefetch fails three profile
tests.

Finding: the first demo score generator averaged four CAT4 batteries
towards 100, so no student was off track. A demo-data test now requires
all status bands, and each invented student has a stable ability with
smaller per-measure variation.

The original modal could not be rendered for a side-by-side comparison:
it needs EduFeedbackPro's database. The profile keeps the sheet and card
values already measured from the rendered reference, and follows the
original source for the header and report rows.

### Verification

- API unit suite: 49 passed. PostgreSQL integration suite: 32 passed,
  including constraint rejections for stanine, standard age score,
  percentile, raw score, sitting date, duplicate sittings and cross-school
  students, and scoping by school, year group and enrolment year.
- Playwright: 53 passed, including keyboard opening and focus return,
  assessment wording, shared profile pages, missing, failed and
  out-of-scope data, and the directory staying unchanged behind the
  profile.
- Against the real API and seeded database, a head of year opened a
  Year 9 profile with CAT4 and NGRT results and their previous sittings;
  no page-level horizontal overflow at 390 px.
- The migration applies cleanly with no schema drift; lint, typecheck and
  both production builds passed.

## 2026-11-09: Dashboards, analytics and rankings

Added the teacher and leadership dashboard, cohort analytics and assessment
ranking routes. They share one API aggregation feature and the assessment
indicator rules, while organisation and year-group restrictions remain in the
database query. Ranking pagination is server-side and stable; the response also
contains its filter options so the page makes one cohort request.

The web routes render on the server with URL-owned filters and uncached,
authenticated reads. Suspense boundaries preserve Next.js partial prerendering.
The teacher and Head of Year surface uses the original widget, performance and
ranking composition; the headteacher surface uses the original leadership
intelligence composition. Their component class values, gradients, spacing,
borders and responsive breakpoints were migrated from the source rather than
redesigned. Semantic tables or text summaries provide accessible chart
equivalents, with no new frontend dependency.

The original application was inspected read-only as a source and visual
reference. No private dataset was opened and no source record or asset was
imported. Browser fixtures and integration records are independently invented.

### Verification

- API unit suite: 53 tests passed.
- PostgreSQL integration suite: 33 tests passed against the isolated local
  `attainline_test` database.
- Playwright: 62 tests passed, including the complete signed-in journey,
  school switching, empty and failed analytics, keyboard filter operation and
  layouts at 390, 768, 1024 and 1440 px. A role-specific test exercises the
  original teacher dashboard composition separately from leadership.
- Frontend lint, workspace typecheck and both production builds passed on
  Node.js 24.19.0. The three analytics routes build as partial prerenders.
