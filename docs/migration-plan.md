# Incremental migration plan

This plan records the public Attainline rebuild as ten coherent batches. Ten
is intentional: contract hardening, API expansion and browser interactions
have independent failure modes and review surfaces, so combining them with
neighbouring features would make the history less truthful.

| Batch | Objective and boundary | Verification | Commit | Decision / trade-off |
| --- | --- | --- | --- | --- |
| 1 | Establish the pnpm workspace, Next.js app, Express app, CI skeleton and API container. No product data flow. | Frozen install, typecheck, builds, container health. | `chore: initialise workspace, API container and build checks` (`ded678f`) | Keep web and API deployable independently at the cost of two local processes. |
| 2 | Add organisation, student and annual-enrolment persistence plus readiness. Database constraints own tenant relationships; HTTP liveness stays separate. | Constraint integration tests, readiness tests, API build. | `feat(api): add student data model and database readiness` (`21e8d64`) | Model annual placement separately from identity; do not infer activity from timestamps. |
| 3 | Add the organisation-scoped student directory API with keyset pagination. No frontend migration. | Route tests and PostgreSQL query integration tests. | `feat(api): add organisation-scoped student directory` (`08a46d2`) | Keyset pagination avoids offset drift but does not provide a snapshot or page totals. |
| 4 | Encrypt cursors and make database diagnostics safe. API infrastructure only. | Cursor tamper/boundary tests, database-error tests, build. | `fix(api): encrypt student cursors and harden database diagnostics` (`bb8db6`) | Encryption keeps row keys out of URLs; key rotation invalidates issued cursors and is not authorisation. |
| 5 | Migrate the dashboard shell and connect the server-rendered directory. Keep authentication and memberships synthetic and out of scope. | Browser shell/directory tests at desktop and phone widths, lint, build. | `feat(web): migrate dashboard shell and connect student directory` (`74194f6`) | Preserve the collapsed teacher layout while using narrow client boundaries for interaction. |
| 6 | Add organisation-scoped PostgreSQL search across names and reference. API owns filtering; the URL owns submitted search state. | Route, integration and browser search tests. | `feat(students): add organisation-scoped directory search` (`fe9be5d`) | Explicit submission avoids request-per-keystroke; substring search has no scale claim without measurements. |
| 7 | Strengthen search boundary tests and document URL/privacy behavior. No new product capability. | Adversarial cursor/search cases, API contract parsing, CI checks. | `test(students): strengthen search boundary checks and document API URLs` (`3b33510`) | Keep this separate because it changes the evidence and privacy contract, not the feature surface. |
| 8 | Add academic-year placement selection to the API and directory. Placement/domain changes stop at the existing schema. | Route/integration tests and browser year-state tests. | `feat(students): add academic-year placements to the directory` (`0fbda32`) | Use the newest year with enrolments rather than the clock; one placement per year does not model mid-year moves. |
| 9 | Add independently invented multi-year demo fixtures, allowlisted surname sorting and a tenant-and-year-scoped student-detail API. No browser UI. | Demo-data and route unit tests, PostgreSQL query integration tests, API typecheck/build. | `feat(api): add directory sorting and student details` (`bc13e63`) | Reverse both surname and ID for stable descending keysets; return 404 for both foreign-tenant and wrong-year detail lookups. |
| 10 | Add column visibility, refresh, sorting links and race-safe student details while matching the private reference accessibly. The browser talks to details through a validating Next.js proxy. | Frontend lint, typecheck and build; desktop/phone, keyboard, focus, error, race, reduced-motion and presentation Playwright tests. | `feat(web): complete student directory interactions` | Keep local presentation state out of the URL, but keep server filters in it; diverge from reference colours where WCAG contrast requires it. |

Authentication, school memberships, analytics, interventions, photographs and
real pupil data are explicitly outside these batches. The original private
application is a read-only visual and workflow reference.
