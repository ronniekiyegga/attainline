import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, type TestContext } from "node:test";
import express from "express";
import { database } from "../src/database.js";
import { createAnalyticsController } from "../src/features/analytics/analytics.controller.js";
import { listCohortAssessmentRows } from "../src/features/analytics/analytics.repository.js";
import { createAnalyticsRouter } from "../src/features/analytics/analytics.routes.js";
import { createAnalyticsService } from "../src/features/analytics/analytics.service.js";
import { listen, recordingLogger, signedInAs } from "./support/http.js";
import { requireLocalTestDatabase } from "./support/test-database.js";

requireLocalTestDatabase();

async function createFixtures() {
  const organisationId = randomUUID();
  const otherOrganisationId = randomUUID();
  await database.organisation.createMany({ data: [
    { id: organisationId, name: "Synthetic analytics school" },
    { id: otherOrganisationId, name: "Synthetic other school" },
  ] });

  const [yearNine, yearSeven, foreign] = await Promise.all([
    database.student.create({ data: { organisationId, institutionStudentRef: "ANALYTICS-001", firstName: "Aster", surname: "Ashgrove" } }),
    database.student.create({ data: { organisationId, institutionStudentRef: "ANALYTICS-002", firstName: "Briar", surname: "Brackenridge" } }),
    database.student.create({ data: { organisationId: otherOrganisationId, institutionStudentRef: "ANALYTICS-001", firstName: "Celyn", surname: "Cindermoor" } }),
  ]);

  await database.studentEnrolment.createMany({ data: [
    { organisationId, studentId: yearNine.id, academicYearStart: 2026, yearGroup: 9, classGroup: "9A" },
    { organisationId, studentId: yearSeven.id, academicYearStart: 2026, yearGroup: 7, classGroup: "7A" },
    { organisationId: otherOrganisationId, studentId: foreign.id, academicYearStart: 2026, yearGroup: 9, classGroup: "9B" },
  ] });

  await database.assessmentResult.createMany({ data: [
    { organisationId, studentId: yearNine.id, measure: "CAT4_MEAN", academicYearStart: 2026, satOn: new Date("2026-10-05"), standardAgeScore: 108, stanine: 6 },
    { organisationId, studentId: yearNine.id, measure: "CAT4_QUANTITATIVE", academicYearStart: 2026, satOn: new Date("2026-10-05"), standardAgeScore: 89, stanine: 3 },
    { organisationId, studentId: yearSeven.id, measure: "CAT4_MEAN", academicYearStart: 2026, satOn: new Date("2026-10-05"), standardAgeScore: 99, stanine: 5 },
    { organisationId: otherOrganisationId, studentId: foreign.id, measure: "CAT4_MEAN", academicYearStart: 2026, satOn: new Date("2026-10-05"), standardAgeScore: 141, stanine: 9 },
  ] });

  async function cleanup() {
    const organisations = [organisationId, otherOrganisationId];
    await database.assessmentResult.deleteMany({ where: { organisationId: { in: organisations } } });
    await database.studentEnrolment.deleteMany({ where: { organisationId: { in: organisations } } });
    await database.student.deleteMany({ where: { organisationId: { in: organisations } } });
    await database.organisation.deleteMany({ where: { id: { in: organisations } } });
  }

  return { organisationId, otherOrganisationId, cleanup };
}

async function startApi(context: TestContext, organisationId: string, yearGroups: number[] | null) {
  const { logger } = recordingLogger();
  const service = createAnalyticsService({ listCohortAssessmentRows });
  const app = express();
  app.use(signedInAs({ organisationId, yearGroups }));
  app.use("/analytics", createAnalyticsRouter(createAnalyticsController({ service, logger })));
  return listen(context, app);
}

test("analytics and rankings stay inside the active organisation and assigned year groups", async (context) => {
  const fixtures = await createFixtures();

  try {
    const wholeSchool = await startApi(context, fixtures.organisationId, null);
    const yearNine = await startApi(context, fixtures.organisationId, [9]);
    const otherSchool = await startApi(context, fixtures.otherOrganisationId, null);

    const wholeOverview = await (await fetch(`${wholeSchool}/analytics/overview?academicYearStart=2026`)).json();
    const yearOverview = await (await fetch(`${yearNine}/analytics/overview?academicYearStart=2026`)).json();
    const otherOverview = await (await fetch(`${otherSchool}/analytics/overview?academicYearStart=2026`)).json();

    assert.equal(wholeOverview.cohortSize, 2);
    assert.equal(yearOverview.cohortSize, 1);
    assert.equal(yearOverview.topRankings[0].surname, "Ashgrove");
    assert.equal(otherOverview.cohortSize, 1);
    assert.equal(otherOverview.topRankings[0].surname, "Cindermoor");

    const rankings = await (await fetch(`${wholeSchool}/analytics/rankings?academicYearStart=2026&measure=CAT4_MEAN&page=1&limit=1`)).json();
    assert.equal(rankings.total, 2);
    assert.equal(rankings.items.length, 1);
    assert.equal(rankings.items[0].surname, "Ashgrove");

    assert.equal((await fetch(`${yearNine}/analytics/rankings?academicYearStart=2026&yearGroup=7`)).status, 403);
  } finally {
    await fixtures.cleanup();
  }
});
