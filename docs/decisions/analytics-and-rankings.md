# Analytics and rankings

## Problem

Dashboards, profiles and rankings need consistent assessment indicators without
shipping a whole cohort to the browser or duplicating access rules.

## Constraints

Every read must remain inside the active organisation and assigned year groups.
The demonstration has a school-sized synthetic cohort, nine assessment measures
and paginated responses. It does not have production traffic or scale evidence.

## Alternatives

- Browser aggregation was rejected because it would expose an oversized cohort
  response and duplicate trusted calculations in an untrusted client.
- PostgreSQL window functions would reduce API materialisation but add a more
  specialised query before the measured workload requires it.
- Maintained aggregates would make reads cheap while adding migrations,
  invalidation and rebuild behaviour.
- Separate endpoints for every card and chart would create request waterfalls
  and repeat the same scoped cohort read.

## Complexity

For `N` visible students, `A` returned assessment rows, at most `M = 9`
measures and `R` ranked students, the current ranking path is
`O(A + NM + R log R)` time and `O(NM + R)` auxiliary space. Pagination bounds
the response to `K` rows but occurs after global rank is established. Overview
aggregation is `O(A + NM + R log R)`: it visits the assessment rows, calculates
per-student indicators and sorts the ranked subset used for its preview.

## Evidence

Local PostgreSQL plans, scaled in-process ranking measurements and production-
mode browser timings are recorded in [Performance and complexity evidence](../performance.md).
At 6,500 fully assessed synthetic students, the isolated ranking calculation
measured 5.735 ms median and 7.503 ms p95 over 30 runs. This excludes database
and HTTP time and is not a production-scale claim.

## Decision

Dashboard, analytics and ranking reads use one analytics feature in the API.
Its repository loads the visible academic-year cohort and only the assessment
fields needed for aggregation. The organisation, academic year, optional year
group and staff year-group restrictions are part of that Prisma query.

The service selects the latest sitting for each student and measure, then uses
the assessment feature's status, priority and ranking definitions. It produces
the overview and the stable score-descending, surname-then-ID ranking. The
ranking response also carries the visible year groups, avoiding a second cohort
request for its filter controls.

The Next.js routes are React Server Components behind Suspense boundaries.
Their filters are URL state and their authenticated API requests are not
cached. Small client components are used only where browser interaction is
required. Charts use semantic HTML and CSS and are paired with text or table
equivalents; they do not add a charting dependency.

Dashboard composition is role-aware. Teachers and heads of year receive the
original widget, performance-overview and ranking composition within their
visible year groups. Headteachers receive the original leadership-intelligence
composition at whole-school scope. Both surfaces consume the same overview
contract; the view does not reinterpret access policy.

## Trade-off

Pagination limits the ranking payload, not the work needed to establish a
global rank. The service therefore inspects the selected visible cohort before
slicing a page. This is one bounded, selected-field query and is appropriate for
the current school-sized dataset; larger datasets should move latest-result
selection, aggregation and window ranking into database queries or maintained
aggregates after measuring the real workload.

The private application was used only as a read-only source and visual
reference. Component class values, layout structure and responsive breakpoints
were migrated from its dashboard source rather than redesigned. No records or
private assets were copied into this repository; all fixtures and demo records
remain independently invented.
