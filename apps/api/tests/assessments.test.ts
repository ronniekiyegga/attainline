import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculatePriority,
  calculateStatus,
  type MeasureScore,
} from "../src/features/assessments/assessment.indicators.js";
import type { StoredResult } from "../src/features/assessments/assessment.repository.js";
import { createAssessmentService } from "../src/features/assessments/assessment.service.js";

const access = { organisationId: "11111111-1111-4111-8111-111111111111", yearGroups: null };
const studentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function score(measure: MeasureScore["measure"], standardAgeScore: number): MeasureScore {
  return { measure, standardAgeScore };
}

function stored(
  measure: StoredResult["measure"],
  satOn: string,
  standardAgeScore: number,
  extra: Partial<StoredResult> = {},
): StoredResult {
  const date = new Date(`${satOn}T00:00:00Z`);
  const month = date.getUTCMonth();

  return {
    measure,
    academicYearStart: month >= 8 ? date.getUTCFullYear() : date.getUTCFullYear() - 1,
    satOn: date,
    rawScore: null,
    rawScoreMaximum: null,
    standardAgeScore,
    stanine: 5,
    nationalPercentileRank: null,
    ...extra,
  };
}

test("status averages CAT4 mean, PTE and NGRT standard age scores only", () => {
  assert.deepEqual(
    calculateStatus([
      score("CAT4_MEAN", 104),
      score("PTE", 98),
      score("NGRT_READING", 101),
      score("PTM", 60),
      score("CAT4_QUANTITATIVE", 141),
    ]),
    { value: "ON_TRACK", averageStandardAgeScore: 101, basedOn: ["CAT4_MEAN", "PTE", "NGRT_READING"] },
  );
});

test("status follows the original thresholds at each boundary", () => {
  for (const [average, expected] of [
    [100, "ON_TRACK"],
    [99, "AT_RISK"],
    [95, "AT_RISK"],
    [94, "PENDING"],
    [90, "PENDING"],
    [89, "OFF_TRACK"],
  ] as const) {
    assert.equal(calculateStatus([score("CAT4_MEAN", average)]).value, expected, String(average));
  }
});

test("status without any qualifying result is pending and says so", () => {
  assert.deepEqual(calculateStatus([score("PTM", 120)]), {
    value: "PENDING",
    averageStandardAgeScore: null,
    basedOn: [],
  });
});

test("priority uses the CAT4 quantitative score with the original thresholds", () => {
  for (const [value, expected] of [
    [80, "HIGH"],
    [90, "HIGH"],
    [91, "MEDIUM"],
    [99, "MEDIUM"],
    [100, "LOW"],
  ] as const) {
    assert.equal(calculatePriority([score("CAT4_QUANTITATIVE", value)]).value, expected, String(value));
  }

  assert.deepEqual(calculatePriority([score("CAT4_MEAN", 70)]), {
    value: "MEDIUM",
    standardAgeScore: null,
    basedOn: null,
  });
});

test("returns each measure's latest result in the year with its previous sitting", async () => {
  const service = createAssessmentService({
    findStudent: async () => ({
      id: studentId,
      institutionStudentRef: "SYN-1",
      firstName: null,
      surname: "Brimley",
      yearGroup: 9,
      classGroup: null,
    }),
    listResultsUpToYear: async () => [
      stored("CAT4_MEAN", "2026-10-05", 104),
      stored("CAT4_MEAN", "2025-10-06", 99),
      stored("PTM", "2026-06-15", 97, { rawScore: 41, rawScoreMaximum: 60 }),
      stored("NGRT_READING", "2027-03-01", 92),
      stored("NGRT_READING", "2026-10-07", 95),
    ],
  });

  const result = await service.describeStudentAssessments(access, studentId, 2026);

  assert.deepEqual(result?.results, [
    {
      measure: "CAT4_MEAN",
      satOn: "2026-10-05",
      rawScore: null,
      rawScoreMaximum: null,
      standardAgeScore: 104,
      stanine: 5,
      nationalPercentileRank: null,
      previous: { satOn: "2025-10-06", standardAgeScore: 99, stanine: 5 },
    },
    {
      measure: "NGRT_READING",
      satOn: "2027-03-01",
      rawScore: null,
      rawScoreMaximum: null,
      standardAgeScore: 92,
      stanine: 5,
      nationalPercentileRank: null,
      previous: { satOn: "2026-10-07", standardAgeScore: 95, stanine: 5 },
    },
  ]);
  assert.equal(result?.status.value, "AT_RISK");
  assert.deepEqual(result?.status.basedOn, ["CAT4_MEAN", "NGRT_READING"]);
});

test("does not read results for a student outside the caller's access", async () => {
  let reads = 0;
  const service = createAssessmentService({
    findStudent: async () => null,
    listResultsUpToYear: async () => {
      reads++;
      return [];
    },
  });

  assert.equal(await service.describeStudentAssessments(access, studentId, 2026), null);
  assert.equal(reads, 0);
});
