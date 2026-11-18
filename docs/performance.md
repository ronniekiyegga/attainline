# Performance and complexity evidence

This record describes the synthetic demonstration workload. It is not a claim
about production school scale or internet latency.

## Complexity model

| Operation | Time complexity | Auxiliary space | Where the work happens | Limitation |
| --- | --- | --- | --- | --- |
| Directory page | PostgreSQL follows the organisation/surname/ID access path and stops after `K + 1` visible rows; application mapping is `O(K)` | `O(K)` response rows | PostgreSQL, then API | Index traversal depends on selectivity and enrolment checks; it is not universally `O(log N)` |
| Substring search | Up to `O(S)` scoped rows for the three `ILIKE '%term%'` predicates, plus ordering of matches | Proportional to the database plan's match/sort working set | PostgreSQL | The B-tree ordering index cannot accelerate arbitrary substring matching |
| Student profile | Indexed student visibility checks plus `R` assessment rows; database ordering can cost `O(R log R)`, while the current grouping performs `O(R²)` allocation work in the worst case | `O(R)` live data | PostgreSQL and API | `R` is small and bounded by one student's sittings in the demo; the repeated copies should be replaced only if larger histories make them measurable |
| Latest sitting per cohort | `O(A)` because each result is visited once and each student's seen-measure set has at most nine entries | `O(NM)` for the loaded cohort and latest results | API memory | The repository loads the visible cohort before aggregation |
| Overview aggregation | `O(A + NM + R log R)`: visit assessment rows, calculate per-student indicators, then establish the top CAT4 ranking | `O(A + NM + R)` including the repository result already resident in memory | API memory | Sorting the whole ranked subset is simpler than a top-`K` heap at the current cohort size |
| Global ranking | `O(A + NM + R log R)` before `O(K)` response slicing | `O(NM + R)`; response is `O(K)` | API memory | Pagination bounds the payload, not the cohort work |
| Indicator calculation | Status performs three measure filters and a reduction; priority performs one find: `O(M)` | `O(M)` for selected status inputs | API memory | `M` is currently bounded by nine assessment measures |

`N` is visible students, `A` is their returned assessment rows, `M` is distinct
measures per student (maximum nine), `R` is ranked students, `S` is scoped rows
considered by substring search, and `K` is page size.

The directory uses keyset continuation rather than offset scanning. The profile
loads details and assessments concurrently at the web boundary. The assessment
request repeats the scoped student-visibility lookup before reading results;
that is an intentional authorisation check, not an N+1 query. Prisma relation
loads and the API calculations operate on whole selected sets rather than one
database request per student.

## PostgreSQL evidence

Measurements used PostgreSQL 18.6 on the local synthetic database: 67 students,
119 enrolments and 858 assessment results. `EXPLAIN (ANALYZE, BUFFERS)` was run
once per representative query after the database was already warm.

| Query | Selected rows and plan | Execution |
| --- | --- | --- |
| First directory page | 26 rows; `students_organisation_id_surname_id_idx`, then 26 indexed enrolment probes | 0.117 ms |
| Substring search | 67 scoped student rows considered; sequential scan and 25 kB sort working set | 0.123 ms |
| One student's history | 6 rows; bitmap scan on the student/measure/date unique index and 25 kB sort | 0.107 ms |
| Cohort assessment read | 360 of 858 result rows joined to 61 enrolments; sequential scans, hash join and 44 kB sort | 0.251 ms |

Sequential scans are appropriate for these small tables. The results do not
justify a trigram index, a new academic-year index or maintained aggregates.
Plans must be remeasured with representative larger data before changing those
structures.

## Ranking CPU evidence

The actual `createAnalyticsService().listRankings()` implementation was supplied
preloaded synthetic rows to isolate in-process calculation from database and
HTTP time. Each student had all nine measures. Runs used Node.js 24.19.0 on an
Apple M3 Max with 36 GB RAM, five warm-ups and 30 measured iterations per size.

| Students | Assessment rows | Median | p95 | Maximum | First-page JSON |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 65 | 585 | 0.084 ms | 0.144 ms | 0.185 ms | 2,541 bytes |
| 650 | 5,850 | 0.686 ms | 0.870 ms | 0.921 ms | 2,545 bytes |
| 6,500 | 58,500 | 5.735 ms | 7.503 ms | 8.611 ms | 2,548 bytes |

This isolates CPU work and demonstrates growth; it does not include Prisma row
materialisation, network transfer or request validation. A separate earlier
full local service measurement over 61 visible students used 30 warm runs and
recorded 2.885 ms median, 4.121 ms p95, 5.616 ms maximum and a 2,478-byte page.

## Frontend evidence

The production Next.js build ran against the synthetic stand-in API on local
loopback. Chromium used a 1440 × 900 viewport and an authenticated synthetic
session. Navigation measurements used three warm-ups followed by the iterations
shown. They measure click-to-target-visible time, not Core Web Vitals or public
network performance.

| Interaction | Iterations | Median | p95 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| Dashboard → analytics | 20 | 59.4 ms | 74.2 ms | 74.2 ms |
| Dashboard → rankings | 30 | 58.8 ms | 76.0 ms | 832.8 ms |
| Dashboard → directory | 20 | 36.3 ms | 46.5 ms | 48.6 ms |
| Directory → profile dialog | 10 | 337.5 ms | 828.9 ms | 828.9 ms |

The ranking run had one value above 200 ms. The profile dialog performs two
parallel HTTP requests, and the assessment path performs its own visibility
check before loading results. The sample is too small and the loopback setup too
artificial to justify memoisation, prefetch changes or a combined endpoint.

A fresh dashboard context loaded a 67,356-byte HTML document and 11 JavaScript
resources totalling 191,987 encoded bytes (195,287 transferred bytes locally).
Routes keep protected reads in Server Components; client code is limited to
navigation, dialogs, form controls and local presentation state. URL-owned
search, sort, year and cursor state avoids a browser data cache and sends only a
25-row directory page or 10-row ranking page.

## Decision threshold

Keep the current implementation for the documented synthetic workload. Move
latest-result selection and ranking into PostgreSQL window functions when a
representative workload shows cohort materialisation, API memory or sort time is
material. Consider a trigram index only when real substring-search plans show
scoped sequential scans are too costly. Consider a combined profile endpoint
only if end-to-end traces show the parallel requests and repeated visibility
lookup dominate user-perceived latency.
