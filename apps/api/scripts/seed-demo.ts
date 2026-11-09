import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import {
  DEMO_ACADEMIC_YEAR_STARTS,
  demoEnrolments,
  demoOrganisations,
  demoStudents,
} from "./demo-data.js";

const TARGET_HOSTS = ["localhost", "127.0.0.1"];
const TARGET_DATABASE = "attainline";

function targetUrl(): string {
  const value = process.env.SEED_DATABASE_URL;

  if (!value || !URL.canParse(value)) {
    throw new Error("Set SEED_DATABASE_URL to the local development database");
  }

  const url = new URL(value);

  if (!TARGET_HOSTS.includes(url.hostname) || url.pathname !== `/${TARGET_DATABASE}`) {
    throw new Error(
      `The demo seed only targets the local "${TARGET_DATABASE}" database`,
    );
  }

  return value;
}

const database = new PrismaClient({
  adapter: new PrismaPg({ connectionString: targetUrl() }),
});

try {
  for (const organisation of demoOrganisations) {
    const addedOrganisation = await database.organisation.createMany({
      data: [{ id: organisation.id, name: organisation.name }],
      skipDuplicates: true,
    });

    const students = demoStudents(
      organisation.id,
      organisation.prefix,
      organisation.students,
    );

    const added = await database.student.createMany({
      data: students,
      skipDuplicates: true,
    });

    const stored = await database.student.findMany({
      where: {
        organisationId: organisation.id,
        institutionStudentRef: {
          in: students.map((student) => student.institutionStudentRef),
        },
      },
      select: { id: true, institutionStudentRef: true },
    });

    const organisationNote = addedOrganisation.count === 1
      ? `added "${organisation.name}"`
      : "kept the existing organisation row";

    console.info(
      `${organisation.id}: ${organisationNote}; added ${added.count} of ${students.length} demo students`,
    );

    for (const academicYearStart of DEMO_ACADEMIC_YEAR_STARTS) {
      const enrolments = demoEnrolments(organisation.id, stored, academicYearStart);

      const addedEnrolments = await database.studentEnrolment.createMany({
        data: enrolments,
        skipDuplicates: true,
      });

      const existing = await database.studentEnrolment.findMany({
        where: {
          organisationId: organisation.id,
          academicYearStart,
          studentId: { in: enrolments.map((enrolment) => enrolment.studentId) },
        },
        select: { studentId: true, yearGroup: true, classGroup: true },
      });

      const expected = new Map(
        enrolments.map((enrolment) => [enrolment.studentId, enrolment]),
      );
      const differing = existing.filter((enrolment) => {
        const placement = expected.get(enrolment.studentId);
        return placement?.yearGroup !== enrolment.yearGroup
          || placement.classGroup !== enrolment.classGroup;
      });

      console.info(
        `${organisation.id} ${academicYearStart}: added ${addedEnrolments.count} of ${enrolments.length} demo enrolments`
          + (differing.length > 0
            ? `; left ${differing.length} existing enrolments that differ from the demo placement unchanged`
            : ""),
      );
    }
  }
} finally {
  await database.$disconnect();
}
