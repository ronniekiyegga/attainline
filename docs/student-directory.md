# Student directory

## Purpose

Help school staff identify students and view their placement for an
academic year, using the existing EduFeedbackPro table presentation.

## Delivery scope

Implemented:
- Organisation-scoped student listing.
- Encrypted cursor pagination ordered by surname and ID.
- Server-side search by first name, surname or reference, with
  pagination bound to the search.
- Academic-year tabs, defaulting to the newest year with enrolments.
- Students enrolled in the selected year, with that year's year group and
  class group.
- The original table's toolbar, header, rows, columns menu and student
  details sheet, compared against a rendered reference (see Presentation
  rules).
- Server-side surname sorting in both directions, with ID as tie-breaker.
- Column visibility for reference, year group and class, kept across
  client-side navigation and reset by a full page load.
- A refresh control that re-fetches in place.
- A student details dialog showing identity and the selected year's
  placement.
- Loading, empty, no-enrolment, invalid-link and unavailable states.
- Synthetic demo data for two academic years.

Not migrated from the original table: row selection, drag reordering,
face-card view, sorting by other columns, avatars and photographs,
priority, status, progress and last-active columns, and total counts. The
student profile is described in docs/decisions/assessment-results.md.

Access is limited to the signed-in membership's school and, for heads of
year and teachers, their assigned year groups (see
docs/decisions/authentication-and-sessions.md).
The public demo must contain only independently invented records.

## Entities and rules

Organisation is the tenant boundary.

Student holds identity and an institution reference unique within its
organisation. Names are display values, not identifiers.

StudentEnrolment holds placement for an academic year. The current model
permits one placement per student per academic year; it does not track
class changes within that year.

An enrolment must reference a student in the same organisation.
The database enforces this through a composite foreign key.

## API

GET /students/academic-years

Returns academicYearStarts: years with enrolments, newest first, or an
empty list when the organisation has none.

GET /students?academicYearStart=2026&limit=25&q=<term>&sort=surname-asc&cursor=<opaque-token>

academicYearStart is required. Returns items, nextCursor and limit for
students enrolled in that year. Each item contains id,
institutionStudentRef, firstName, surname, yearGroup (integer) and
classGroup (string or null).

sort is surname-asc (default) or surname-desc. The cursor is bound to the
organisation, academic year, search and sort. Changing any of them
starts a new pagination sequence.

GET /students/<id>?academicYearStart=2026

Returns the same fields as a directory item for one student visible to
the session, or 404 when the student is not enrolled in that
year or belongs to another organisation. The student profile requests it
together with the student's assessment results.

Invalid parameters return 400. Query failures return 503.
An empty successful result returns 200 with an empty items array.

See docs/decisions/student-directory-annual-placement.md and
docs/decisions/student-directory-interactions.md for the decisions and
their limits.

## Presentation rules

Preserve the original table's visual design. The reference is the
EduFeedbackPro StudentDataTable, columns menu and StudentModal rendered
from their own source and Tailwind 3 configuration with invented data.
They were compared with this app at 1440, 1024, 768, 767 and 390 pixels
wide, in the same browser with the same Inter files, for the populated,
empty, loading and failure states, the open columns menu and the open
details sheet. `tests/student-directory-presentation.spec.ts` checks the
measured values that matter most: header and row heights, the card shadow,
type sizes and colours, the year tab, the columns menu and the details
sheet.

The original uses Tailwind 3 colours. `globals.css` pins the slate, gray,
zinc, blue, violet, purple, red, emerald, green, amber, yellow and rose
scales to those values, because the Tailwind 4 defaults render
slightly different colours.

Known differences from the reference:
- Missing columns, avatars, drag handles, selection, status tabs with
  counts and the table/face-card switch are not migrated.
- The toolbar has an explicit Search button, because search is submitted
  rather than run on every keystroke, and the column control is labelled
  Columns instead of Filter.
- Rows open the student profile from a View link instead of an actions
  menu.
- Pagination shows First page and Next page instead of Previous and Next
  with page counts, because cursors only move forward.
- The profile shows initials instead of a photograph, and a Close button
  beside the status.
- While loading, only the table skeleton is shown; the original also shows
  its toolbar.
- A failed load shows an error with a retry link; the original shows the
  same "No results" row as an empty directory.

The details card keeps the original gradient treatment, but deliberately
darkens it and lightens secondary text instead of copying the reference's
inaccessible colours. Against the lightest gradient stop, white text has
6.39:1 contrast, gray-100 has 5.80:1 and gray-200 has 5.16:1. These all
exceed the WCAG AA 4.5:1 minimum for text of this size. Inactive academic
year labels likewise use gray-500 rather than the reference's gray-400,
providing 4.63:1 contrast against the tab background. Missing class values
use slate-600 on white rather than slate-400, providing 7.58:1.

Do not describe a database update timestamp as student activity.
Do not describe a CAT4 score as progress over time.
Priority and status need explicit business definitions before migration.

## Failure and consistency behaviour

A database failure must remain distinct from an empty directory.
Invalid pagination must not silently restart at the first page.

Pagination does not provide a snapshot. Inserts before the cursor appear
when browsing restarts; surname changes can move records across pages.

Prisma loads a page's students and their enrolments with two queries.
Both run in one repeatable-read transaction, so an enrolment removed
between them cannot leave a listed student without the placement that
qualified it.

Surname order and cursor comparisons both use the database collation, so
paging is consistent within one database. Order can differ between
databases with different collations: the local test database may use
`C`, which sorts upper case before lower case, while the CI PostgreSQL
image uses `en_US.utf8`.

When the URL names an academic year, the web app requests that year's
students alongside the list of years instead of after it. A link to a
year without enrolments therefore makes one list request whose result is
discarded.

A student outside the session's school or year groups returns 404, the
same as a student that does not exist.
