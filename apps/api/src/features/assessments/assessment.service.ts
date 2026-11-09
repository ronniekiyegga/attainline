import type { findStudent, StudentAccess } from "../students/student.repository.js";
import { calculatePriority, calculateStatus } from "./assessment.indicators.js";
import type { listResultsUpToYear, StoredResult } from "./assessment.repository.js";

type AssessmentServiceDependencies = {
  findStudent: typeof findStudent;
  listResultsUpToYear: typeof listResultsUpToYear;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function latestWithPrevious(results: StoredResult[], academicYearStart: number) {
  const byMeasure = new Map<StoredResult["measure"], StoredResult[]>();

  for (const result of results) {
    byMeasure.set(result.measure, [...(byMeasure.get(result.measure) ?? []), result]);
  }

  return [...byMeasure.values()].flatMap(([latest, previous]) =>
    latest.academicYearStart === academicYearStart
      ? [{
          measure: latest.measure,
          satOn: isoDate(latest.satOn),
          rawScore: latest.rawScore,
          rawScoreMaximum: latest.rawScoreMaximum,
          standardAgeScore: latest.standardAgeScore,
          stanine: latest.stanine,
          nationalPercentileRank: latest.nationalPercentileRank,
          previous: previous
            ? {
                satOn: isoDate(previous.satOn),
                standardAgeScore: previous.standardAgeScore,
                stanine: previous.stanine,
              }
            : null,
        }]
      : []);
}

export type AssessmentService = ReturnType<typeof createAssessmentService>;

export function createAssessmentService({
  findStudent,
  listResultsUpToYear,
}: AssessmentServiceDependencies) {
  async function describeStudentAssessments(
    access: StudentAccess,
    studentId: string,
    academicYearStart: number,
  ) {
    const student = await findStudent({ access, studentId, academicYearStart });

    if (!student) {
      return null;
    }

    const results = latestWithPrevious(
      await listResultsUpToYear(access, studentId, academicYearStart),
      academicYearStart,
    );

    return {
      academicYearStart,
      status: calculateStatus(results),
      priority: calculatePriority(results),
      results,
    };
  }

  return { describeStudentAssessments };
}
