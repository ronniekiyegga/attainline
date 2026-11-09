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

The browser loads details through a Next.js route handler, because the
API address is server-only configuration. Each time a row's View action
opens the dialog it starts a new selection. Responses are keyed by
selection, student, year and attempt, and the previous request is aborted
when the selection changes, so a slow response cannot replace another
student's details and reopening a student never shows the previous
opening's result.

The web route returns only the six directory fields, whatever else the
API might send, with `Cache-Control: no-store`. The student ID travels in
its URL path, so it can appear in access logs; with real data this route
needs authentication.

The dialog shows identity and placement only. The original modal's
reports, notes, contact details, sharing and next-student actions depend
on data and workflows that do not exist in this project.

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
