# Student directory interactions

Status: accepted for the synthetic demo.

## Sorting

The API accepts `sort=surname-asc` or `sort=surname-desc` and nothing
else; the value selects a fixed Prisma ordering, never a field name taken
from the request. Descending order reverses both surname and ID, so the
keyset comparison flips from "greater than" to "less than" and equal
surnames page in a stable order in both directions.

Cursors carry the sort with the organisation, academic year and search.
A cursor sent with a different sort is rejected with 400 rather than
continuing from a position that means something else in the new order.
The token version was raised to 2 with this payload change, so cursors
issued before sorting existed are rejected by their version byte.

Only surname is sortable. Other columns would each need their own
cursor key and index.

## Student details

`GET /students/:studentId?academicYearStart=` returns the same identity
and placement fields as a directory row. Organisation and year are both
part of the lookup, so a student from another organisation and a student
without that year's enrolment are indistinguishable: both return 404.

The details dialog renders the selected row. It previously fetched this
endpoint through a Next.js route handler, with abortable, selection-keyed
requests and a retry state. That request returned the same six fields the
row already held, so it added latency and a failure mode ("unavailable"
for data already on screen) without adding information. The route handler
and client fetch were removed; opening the dialog makes no request.

The row-backed dialog was later replaced by the student profile, which
adds information the row does not have: that year's assessment results,
status and priority. The profile is a route, `/students/<id>`. A View link
in the table is intercepted by a parallel `@modal` slot and rendered on the
server as a dialog over the directory; loading the same URL directly
renders it as a page. The server requests the student and their
assessments together, so the browser never needs the API address, Back
closes the dialog, and the URL can be shared.

The profile keeps EduFeedbackPro's "Student Portfolio" sheet, face card
and report-row layout. Its risk overview, recommendations, overall
performance and AI summary tabs, notes, contact details, share and
next-student actions, similar-student avatars and assistant are not
migrated. They used heuristics, placeholder or fixture data, or features
outside this project (see docs/decisions/assessment-results.md).

Status colours keep the original band gradients on the indicator dot.
Status text uses darker stops on white (at least 4.92:1) and lighter
stops on the dark card (at least 4.53:1), instead of the original 500
shades, which fail AA for this text size.

The reference card's grey text and light gradient fail WCAG AA contrast
for 11px text. Attainline keeps the gradient treatment but uses a darker
gradient and lighter secondary text. The least-contrasting combination is
gray-200 against the lightest gradient stop at 5.16:1, so visual fidelity
does not override readable text.

## Table state

Column visibility is presentation state. It lives in a React context
around the directory page content, outside its loading boundary. It survives client-side
navigation (pagination, year tabs, sorting and refresh) and resets on a
full page load, which includes submitting the search form. It is not
stored in the URL, browser storage or a global store.

Refresh calls `router.refresh()` inside a transition, which re-runs the
server-rendered directory for the current URL. Year, search, sort and
cursor therefore stay as they are, and the control is disabled while the
transition is pending.

The refresh icon and loading skeleton stop their decorative animation when
the browser requests reduced motion; their text and layout continue to
communicate the same state.
