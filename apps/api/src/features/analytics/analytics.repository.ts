import { database } from "../../database.js";
import type { StudentAccess } from "../students/student.repository.js";

export async function listCohortAssessmentRows(
  access: StudentAccess,
  academicYearStart: number,
) {
  return database.student.findMany({
    where: {
      organisationId: access.organisationId,
      enrolments: {
        some: {
          academicYearStart,
          ...(access.yearGroups && { yearGroup: { in: access.yearGroups } }),
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      surname: true,
      enrolments: {
        where: {
          academicYearStart,
          ...(access.yearGroups && { yearGroup: { in: access.yearGroups } }),
        },
        select: { yearGroup: true, classGroup: true },
        take: 1,
      },
      assessmentResults: {
        where: { academicYearStart },
        orderBy: [{ measure: "asc" }, { satOn: "desc" }],
        select: {
          measure: true,
          standardAgeScore: true,
          stanine: true,
          nationalPercentileRank: true,
        },
      },
    },
    orderBy: [{ surname: "asc" }, { id: "asc" }],
  });
}

export type CohortAssessmentRow = Awaited<ReturnType<typeof listCohortAssessmentRows>>[number];
