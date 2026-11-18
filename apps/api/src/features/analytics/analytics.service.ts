import type { AssessmentMeasure } from "../../generated/prisma/client.js";
import {
  calculatePriority,
  calculateStatus,
  compareRankedScores,
  RANKING_MEASURES,
  type MeasureScore,
  type RankingMeasure,
  type StudentPriority,
  type StudentStatus,
} from "../assessments/assessment.indicators.js";
import type { StudentAccess } from "../students/student.repository.js";
import type {
  CohortAssessmentRow,
} from "./analytics.repository.js";

type AnalyticsServiceDependencies = {
  listCohortAssessmentRows: (
    access: StudentAccess,
    academicYearStart: number,
  ) => Promise<CohortAssessmentRow[]>;
};

type LatestResult = CohortAssessmentRow["assessmentResults"][number];

type CohortStudent = {
  id: string;
  firstName: string | null;
  surname: string;
  yearGroup: number;
  classGroup: string | null;
  latest: LatestResult[];
  status: ReturnType<typeof calculateStatus>;
  priority: ReturnType<typeof calculatePriority>;
};

const statusValues: StudentStatus[] = ["ON_TRACK", "AT_RISK", "PENDING", "OFF_TRACK"];
const priorityValues: StudentPriority[] = ["LOW", "MEDIUM", "HIGH"];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function percentage(value: number, total: number): number {
  return total === 0 ? 0 : round1(value * 100 / total);
}

function latestResults(results: LatestResult[]): LatestResult[] {
  const seen = new Set<AssessmentMeasure>();

  return results.filter(({ measure }) => {
    if (seen.has(measure)) return false;
    seen.add(measure);
    return true;
  });
}

function cohortStudent(row: CohortAssessmentRow): CohortStudent {
  const [placement] = row.enrolments;

  if (!placement) {
    throw new Error("Cohort student has no visible placement");
  }

  const latest = latestResults(row.assessmentResults);
  const scores: MeasureScore[] = latest.map(({ measure, standardAgeScore }) => ({
    measure,
    standardAgeScore,
  }));

  return {
    id: row.id,
    firstName: row.firstName,
    surname: row.surname,
    ...placement,
    latest,
    status: calculateStatus(scores),
    priority: calculatePriority(scores),
  };
}

function countValues<T extends string>(values: readonly T[]): Record<T, number> {
  return Object.fromEntries(values.map((value) => [value, 0])) as Record<T, number>;
}

function describeOverview(students: CohortStudent[], academicYearStart: number) {
  const statusCounts = countValues(statusValues);
  const priorityCounts = countValues(priorityValues);
  const yearGroups = new Map<number, number>();
  const measureScores = new Map<AssessmentMeasure, { scores: number[]; stanines: number[] }>();
  const indicatorAverages: number[] = [];
  let assessedStudents = 0;

  for (const student of students) {
    statusCounts[student.status.value]++;
    priorityCounts[student.priority.value]++;
    yearGroups.set(student.yearGroup, (yearGroups.get(student.yearGroup) ?? 0) + 1);

    if (student.latest.length > 0) assessedStudents++;
    if (student.status.averageStandardAgeScore !== null) {
      indicatorAverages.push(student.status.averageStandardAgeScore);
    }

    for (const result of student.latest) {
      const values = measureScores.get(result.measure) ?? { scores: [], stanines: [] };
      values.scores.push(result.standardAgeScore);
      values.stanines.push(result.stanine);
      measureScores.set(result.measure, values);
    }
  }

  const cohortSize = students.length;

  return {
    academicYearStart,
    cohortSize,
    assessedStudents,
    coveragePercentage: percentage(assessedStudents, cohortSize),
    onTrackPercentage: percentage(statusCounts.ON_TRACK, cohortSize),
    averageStandardAgeScore: indicatorAverages.length === 0
      ? null
      : round1(indicatorAverages.reduce((sum, value) => sum + value, 0) / indicatorAverages.length),
    statusCounts,
    priorityCounts,
    yearGroups: [...yearGroups.entries()]
      .sort(([left], [right]) => left - right)
      .map(([yearGroup, students]) => ({ yearGroup, students })),
    measures: RANKING_MEASURES.flatMap((measure) => {
      const values = measureScores.get(measure);
      if (!values) return [];

      return [{
        measure,
        students: values.scores.length,
        averageStandardAgeScore: round1(
          values.scores.reduce((sum, value) => sum + value, 0) / values.scores.length,
        ),
        averageStanine: round1(
          values.stanines.reduce((sum, value) => sum + value, 0) / values.stanines.length,
        ),
      }];
    }),
  };
}

function rankings(
  students: CohortStudent[],
  measure: RankingMeasure,
  yearGroup?: number,
) {
  return students
    .filter((student) => yearGroup === undefined || student.yearGroup === yearGroup)
    .flatMap((student) => {
      const result = student.latest.find((candidate) => candidate.measure === measure);
      return result ? [{
        id: student.id,
        firstName: student.firstName,
        surname: student.surname,
        yearGroup: student.yearGroup,
        classGroup: student.classGroup,
        standardAgeScore: result.standardAgeScore,
        stanine: result.stanine,
        nationalPercentileRank: result.nationalPercentileRank,
        status: student.status.value,
        priority: student.priority.value,
      }] : [];
    })
    .sort(compareRankedScores)
    .map((student, index) => ({ ...student, rank: index + 1 }));
}

export type AnalyticsService = ReturnType<typeof createAnalyticsService>;

export function createAnalyticsService({
  listCohortAssessmentRows,
}: AnalyticsServiceDependencies) {
  async function loadCohort(access: StudentAccess, academicYearStart: number) {
    return (await listCohortAssessmentRows(access, academicYearStart)).map(cohortStudent);
  }

  async function overview(access: StudentAccess, academicYearStart: number) {
    const students = await loadCohort(access, academicYearStart);

    return {
      ...describeOverview(students, academicYearStart),
      topRankings: rankings(students, "CAT4_MEAN").slice(0, 5),
    };
  }

  async function listRankings(
    access: StudentAccess,
    options: {
      academicYearStart: number;
      measure: RankingMeasure;
      yearGroup?: number;
      page: number;
      limit: number;
    },
  ) {
    const students = await loadCohort(access, options.academicYearStart);
    const ranked = rankings(students, options.measure, options.yearGroup);
    const offset = (options.page - 1) * options.limit;
    const availableYearGroups = [...new Set(students.map(({ yearGroup }) => yearGroup))]
      .sort((left, right) => left - right);

    return {
      academicYearStart: options.academicYearStart,
      measure: options.measure,
      yearGroup: options.yearGroup ?? null,
      cohortSize: students.length,
      availableYearGroups,
      items: ranked.slice(offset, offset + options.limit),
      page: options.page,
      limit: options.limit,
      total: ranked.length,
      totalPages: Math.ceil(ranked.length / options.limit),
    };
  }

  return { overview, listRankings };
}
