# Assessment results

Status: accepted for the synthetic demo.

## Requirement

Staff opening a student need that year's standardised assessment results
and the status and priority EduFeedbackPro derived from them, without
blurring what each number means.

EduFeedbackPro stored the latest CAT4, NGRT and Progress Test scores as
about forty nullable columns on the student row (`cat4_mean_sas`,
`pte_previous_sas`, `ptm_progress_category` and so on), plus a generic
`assessments` table with free-text type, subject and date columns.

## Decision

Store one row per student, measure and sitting date in
`assessment_results`. Measures are an enum: the four CAT4 batteries and
the CAT4 mean, NGRT reading, and the English, Maths and Science Progress
Tests. Each row keeps its scales separate:

- `standard_age_score` (60–141), the age-standardised score with mean 100.
- `stanine` (1–9), as reported, not recomputed.
- `national_percentile_rank` (1–99), when reported.
- `raw_score` with `raw_score_maximum`, both or neither, raw never above
  the maximum. Only Progress Tests carry them in the demo data.

The sitting date must fall inside its academic year (1 September to
31 August), and a student can sit a measure once per day. A composite
foreign key keeps every result in its student's organisation.

`GET /students/:id/assessments?academicYearStart=` returns each measure's
latest result sat in that year and, when one exists, the sitting before
it, which may be from an earlier year. The response shows the change in
standard age score between the two sittings. It never calls that change
progress, and it shows no change when there is only one sitting. A
student must be visible to the caller in that year, by organisation and
year group, before any result is read.

Status and priority keep EduFeedbackPro's definitions
(`domains/student/calculations.ts`) and report their inputs:

- Status averages the latest CAT4 mean, PTE and NGRT standard age scores:
  100 or more is on track, 95–99.9 at risk, 90–94.9 pending, below 90
  off track. With none of the three, status is pending and `basedOn` is
  empty.
- Priority uses the CAT4 quantitative score: 90 or less is high, below 100
  medium, otherwise low. Without that score it is medium.

These live in `assessment.indicators.ts` because rankings and dashboards
reuse them.

## Alternatives considered

- Keeping wide columns on `students`: one current value per measure, no
  history, and "previous" columns that silently overwrite each other.
- A generic results table with free-text type and score fields: cannot
  constrain scales, so a stanine of 12 or a percentile of 0 would be
  accepted.
- Migrating `computeRiskSnapshot`: its score weights QLA results, which
  are out of scope, measures "recent activity" against the current date,
  and treats a lower standard score as declining momentum. With
  synthetic data it would present an arbitrary heuristic as a risk
  judgement, so it is not migrated.

## Limits

- Provider progress categories (for example GL's Progress Test bands)
  are not stored. They need the provider's own rules.
- Standard age scores are compared across sittings as reported. Different
  forms or levels of a test may not be strictly comparable.
- A head of year sees a visible student's earlier results, including years
  before the student joined that year group.
- The demo seed only adds missing rows; it never updates existing results.
