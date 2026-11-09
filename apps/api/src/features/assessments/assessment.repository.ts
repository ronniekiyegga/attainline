import { database } from "../../database.js";
import type { StudentAccess } from "../students/student.repository.js";

export async function listResultsUpToYear(
  access: StudentAccess,
  studentId: string,
  academicYearStart: number,
) {
  return database.assessmentResult.findMany({
    where: {
      organisationId: access.organisationId,
      studentId,
      academicYearStart: { lte: academicYearStart },
    },
    orderBy: [{ measure: "asc" }, { satOn: "desc" }],
    select: {
      measure: true,
      academicYearStart: true,
      satOn: true,
      rawScore: true,
      rawScoreMaximum: true,
      standardAgeScore: true,
      stanine: true,
      nationalPercentileRank: true,
    },
  });
}

export type StoredResult = Awaited<ReturnType<typeof listResultsUpToYear>>[number];
