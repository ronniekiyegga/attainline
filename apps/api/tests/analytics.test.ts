import assert from "node:assert/strict";
import { test } from "node:test";
import type { CohortAssessmentRow } from "../src/features/analytics/analytics.repository.js";
import { createAnalyticsService } from "../src/features/analytics/analytics.service.js";

const access = {
  organisationId: "11111111-1111-4111-8111-111111111111",
  yearGroups: null,
};

function student(
  id: string,
  surname: string,
  yearGroup: number,
  scores: Array<{
    measure: CohortAssessmentRow["assessmentResults"][number]["measure"];
    standardAgeScore: number;
    stanine?: number;
    nationalPercentileRank?: number | null;
  }>,
): CohortAssessmentRow {
  return {
    id,
    firstName: `Student ${id}`,
    surname,
    enrolments: [{ yearGroup, classGroup: `${yearGroup}A` }],
    assessmentResults: scores.map((score) => ({
      stanine: 5,
      nationalPercentileRank: null,
      ...score,
    })),
  };
}

test("builds overview measures and indicators from each measure's latest result", async () => {
  const service = createAnalyticsService({
    listCohortAssessmentRows: async () => [
      student("00000000-0000-4000-8000-000000000001", "Ashgrove", 7, [
        { measure: "CAT4_MEAN", standardAgeScore: 102 },
        { measure: "CAT4_MEAN", standardAgeScore: 70 },
        { measure: "NGRT_READING", standardAgeScore: 98 },
        { measure: "CAT4_QUANTITATIVE", standardAgeScore: 88 },
      ]),
      student("00000000-0000-4000-8000-000000000002", "Brackenridge", 8, []),
    ],
  });

  const overview = await service.overview(access, 2026);

  assert.equal(overview.cohortSize, 2);
  assert.equal(overview.assessedStudents, 1);
  assert.equal(overview.coveragePercentage, 50);
  assert.equal(overview.averageStandardAgeScore, 100);
  assert.deepEqual(overview.statusCounts, {
    ON_TRACK: 1,
    AT_RISK: 0,
    PENDING: 1,
    OFF_TRACK: 0,
  });
  assert.deepEqual(overview.priorityCounts, { LOW: 0, MEDIUM: 1, HIGH: 1 });
  assert.deepEqual(overview.yearGroups, [
    { yearGroup: 7, students: 1 },
    { yearGroup: 8, students: 1 },
  ]);
  assert.deepEqual(overview.measures.find(({ measure }) => measure === "CAT4_MEAN"), {
    measure: "CAT4_MEAN",
    students: 1,
    averageStandardAgeScore: 102,
    averageStanine: 5,
  });
});

test("ranks deterministically, filters year groups and paginates after ranking", async () => {
  const service = createAnalyticsService({
    listCohortAssessmentRows: async () => [
      student("00000000-0000-4000-8000-000000000003", "Cindermoor", 8, [
        { measure: "CAT4_MEAN", standardAgeScore: 108 },
      ]),
      student("00000000-0000-4000-8000-000000000002", "Ashgrove", 7, [
        { measure: "CAT4_MEAN", standardAgeScore: 108 },
      ]),
      student("00000000-0000-4000-8000-000000000001", "Brackenridge", 7, [
        { measure: "CAT4_MEAN", standardAgeScore: 101 },
      ]),
    ],
  });

  const page = await service.listRankings(access, {
    academicYearStart: 2026,
    measure: "CAT4_MEAN",
    yearGroup: 7,
    page: 2,
    limit: 1,
  });

  assert.equal(page.total, 2);
  assert.equal(page.totalPages, 2);
  assert.equal(page.cohortSize, 3);
  assert.deepEqual(page.availableYearGroups, [7, 8]);
  assert.deepEqual(page.items.map(({ rank, surname }) => [rank, surname]), [[2, "Brackenridge"]]);
});
