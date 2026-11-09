import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/features/auth/password.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import {
  DEMO_ACADEMIC_YEAR_STARTS,
  demoEnrolments,
  demoOrganisations,
  demoStaff,
  demoStudents,
} from "./demo-data.js";

const MIN_DEMO_PASSWORD_LENGTH = 12;

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

function demoPassword(): string {
  const value = process.env.DEMO_PASSWORD;

  if (!value || value.length < MIN_DEMO_PASSWORD_LENGTH) {
    throw new Error(
      `Set DEMO_PASSWORD to at least ${MIN_DEMO_PASSWORD_LENGTH} characters for the demo staff accounts`,
    );
  }

  return value;
}

const password = demoPassword();

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

  for (const staff of demoStaff) {
    const existing = await database.user.findUnique({
      where: { email: staff.email },
      select: { id: true },
    });

    const user = existing ?? await database.user.create({
      data: {
        email: staff.email,
        displayName: staff.displayName,
        passwordHash: await hashPassword(password),
      },
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
      `${staff.email}: ${existing ? "kept the existing account and password" : "added"}; `
        + `${staff.memberships.length} ${staff.memberships.length === 1 ? "membership" : "memberships"}`,
    );
  }
} finally {
  await database.$disconnect();
}
