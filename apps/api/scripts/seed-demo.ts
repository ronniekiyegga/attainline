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

  for (const [organisationIndex, organisation] of demoOrganisations.entries()) {
    const creator = await database.organisationMembership.findFirstOrThrow({
      where: { organisationId: organisation.id, role: "HEADTEACHER" },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    const suffix = organisationIndex === 0 ? "1" : "2";
    const events = organisationIndex === 0
      ? [
          {
            id: `33333333-3333-4333-8333-33333333333${suffix}`,
            organisationId: organisation.id,
            createdByMembershipId: creator.id,
            title: "Year 7 assessment review",
            description: "Review the latest synthetic baseline and reading evidence.",
            startsAt: new Date("2026-10-12T14:30:00.000Z"),
            endsAt: new Date("2026-10-12T15:15:00.000Z"),
            yearGroup: 7,
          },
          {
            id: "44444444-4444-4444-8444-444444444441",
            organisationId: organisation.id,
            createdByMembershipId: creator.id,
            title: "Year 8 progress discussion",
            description: "Discuss the invented cohort's current assessment coverage.",
            startsAt: new Date("2026-10-21T09:00:00.000Z"),
            endsAt: new Date("2026-10-21T09:45:00.000Z"),
            yearGroup: 8,
          },
        ]
      : [{
          id: `33333333-3333-4333-8333-33333333333${suffix}`,
          organisationId: organisation.id,
          createdByMembershipId: creator.id,
          title: "Whole-school assessment review",
          description: "Review the fictional demonstration cohort.",
          startsAt: new Date("2026-10-15T10:00:00.000Z"),
          endsAt: new Date("2026-10-15T10:45:00.000Z"),
        }];

    const addedEvents = await database.calendarEvent.createMany({ data: events, skipDuplicates: true });
    console.info(`${organisation.id}: added ${addedEvents.count} of ${events.length} demo calendar events`);
  }
} finally {
  await database.$disconnect();
}
