-- CreateEnum
CREATE TYPE "assessment_measure" AS ENUM ('CAT4_VERBAL', 'CAT4_QUANTITATIVE', 'CAT4_NON_VERBAL', 'CAT4_SPATIAL', 'CAT4_MEAN', 'NGRT_READING', 'PTE', 'PTM', 'PTS');

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "measure" "assessment_measure" NOT NULL,
    "academic_year_start" INTEGER NOT NULL,
    "sat_on" DATE NOT NULL,
    "raw_score" INTEGER,
    "raw_score_maximum" INTEGER,
    "standard_age_score" INTEGER NOT NULL,
    "stanine" INTEGER NOT NULL,
    "national_percentile_rank" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_results_organisation_id_student_id_measure_sat_o_idx" ON "assessment_results"("organisation_id", "student_id", "measure", "sat_on");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_results_student_id_measure_sat_on_key" ON "assessment_results"("student_id", "measure", "sat_on");

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_organisation_id_student_id_fkey" FOREIGN KEY ("organisation_id", "student_id") REFERENCES "students"("organisation_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;


ALTER TABLE assessment_results
  ADD CONSTRAINT assessment_results_academic_year_valid
  CHECK (academic_year_start BETWEEN 1 AND 9998),
  ADD CONSTRAINT assessment_results_sat_within_academic_year
  CHECK (
    sat_on >= make_date(academic_year_start, 9, 1)
    AND sat_on < make_date(academic_year_start + 1, 9, 1)
  ),
  ADD CONSTRAINT assessment_results_standard_age_score_range
  CHECK (standard_age_score BETWEEN 60 AND 141),
  ADD CONSTRAINT assessment_results_stanine_range
  CHECK (stanine BETWEEN 1 AND 9),
  ADD CONSTRAINT assessment_results_percentile_range
  CHECK (national_percentile_rank IS NULL OR national_percentile_rank BETWEEN 1 AND 99),
  ADD CONSTRAINT assessment_results_raw_score_pair
  CHECK ((raw_score IS NULL) = (raw_score_maximum IS NULL)),
  ADD CONSTRAINT assessment_results_raw_score_range
  CHECK (raw_score IS NULL OR (raw_score_maximum > 0 AND raw_score BETWEEN 0 AND raw_score_maximum));
