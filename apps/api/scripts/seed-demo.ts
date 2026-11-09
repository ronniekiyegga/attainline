import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/features/auth/password.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import {
  DEMO_ACCOUNT_PASSWORD,
  DEMO_ACADEMIC_YEAR_STARTS,
  demoAssessmentResults,
  demoEnrolments,
  demoOrganisations,
  demoStaff,
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

      const results = demoAssessmentResults(organisation.id, stored, academicYearStart);
      const addedResults = await database.assessmentResult.createMany({
        data: results,
        skipDuplicates: true,
      });

      console.info(
        `${organisation.id} ${academicYearStart}: added ${addedResults.count} of ${results.length} demo assessment results`,
      );

      console.info(
        `${organisation.id} ${academicYearStart}: added ${addedEnrolments.count} of ${enrolments.length} demo enrolments`
          + (differing.length > 0
            ? `; left ${differing.length} existing enrolments that differ from the demo placement unchanged`
            : ""),
      );
    }
  }

  const passwordHash = await hashPassword(DEMO_ACCOUNT_PASSWORD);

  for (const staff of demoStaff) {
    const existing = await database.user.findUnique({
      where: { email: staff.email },
      select: { id: true },
    });

    const user = await database.user.upsert({
      where: { email: staff.email },
      create: {
        email: staff.email,
        displayName: staff.displayName,
        passwordHash,
      },
      update: { passwordHash },
      select: { id: true },
    });

    for (const { organisationId, role, yearGroups } of staff.memberships) {
      const membership = await database.organisationMembership.upsert({
        where: { userId_organisationId: { userId: user.id, organisationId } },
        create: { userId: user.id, organisationId, role },
        update: {},
        select: { id: true },
      });

      await database.membershipYearGroup.createMany({
        data: yearGroups.map((yearGroup) => ({ membershipId: membership.id, yearGroup })),
        skipDuplicates: true,
      });
    }

    console.info(
      `${staff.email}: ${existing ? "reset the demo password" : "added"}; `
        + `${staff.memberships.length} ${staff.memberships.length === 1 ? "membership" : "memberships"}`,
    );
  }
} finally {
  await database.$disconnect();
}
