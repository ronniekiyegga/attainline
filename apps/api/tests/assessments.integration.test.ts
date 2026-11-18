import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test, type TestContext } from "node:test";
import express from "express";
import { listen, recordingLogger, signedInAs } from "./support/http.js";
import { requireLocalTestDatabase } from "./support/test-database.js";

requireLocalTestDatabase();

const { database } = await import("../src/database.js");
const { findStudent } = await import("../src/features/students/student.repository.js");
const { listResultsUpToYear } = await import("../src/features/assessments/assessment.repository.js");
const { createAssessmentService } = await import("../src/features/assessments/assessment.service.js");
const { createAssessmentController } = await import("../src/features/assessments/assessment.controller.js");
const { createAssessmentRouter } = await import("../src/features/assessments/assessment.routes.js");

after(() => database.$disconnect());

async function startApi(context: TestContext, organisationId: string, yearGroups: number[] | null) {
  const app = express();
  app.use(signedInAs({ organisationId, yearGroups }));
  app.use(
    "/students/:studentId/assessments",
    createAssessmentRouter(
      createAssessmentController({
        service: createAssessmentService({ findStudent, listResultsUpToYear }),
        logger: recordingLogger().logger,
      }),
    ),
  );
  return listen(context, app);
}

async function createFixtures() {
  const organisationId = randomUUID();
  const otherOrganisationId = randomUUID();

  await database.organisation.createMany({
    data: [
      { id: organisationId, name: "Synthetic Assessment Academy" },
      { id: otherOrganisationId, name: "Synthetic Assessment Other" },
    ],
  });

  const [student, younger, foreign] = await Promise.all([
    database.student.create({
      data: { organisationId, institutionStudentRef: "ASSESS-001", surname: "Ashcombe" },
      select: { id: true },
    }),
    database.student.create({
      data: { organisationId, institutionStudentRef: "ASSESS-002", surname: "Brimley" },
      select: { id: true },
    }),
    database.student.create({
      data: { organisationId: otherOrganisationId, institutionStudentRef: "ASSESS-001", surname: "Caldew" },
      select: { id: true },
    }),
  ]);

  await database.studentEnrolment.createMany({
    data: [
      { organisationId, studentId: student.id, academicYearStart: 2025, yearGroup: 8 },
      { organisationId, studentId: student.id, academicYearStart: 2026, yearGroup: 9 },
      { organisationId, studentId: younger.id, academicYearStart: 2026, yearGroup: 7 },
      { organisationId: otherOrganisationId, studentId: foreign.id, academicYearStart: 2026, yearGroup: 9 },
    ],
  });

  const result = (studentId: string, measure: "CAT4_MEAN" | "CAT4_QUANTITATIVE" | "PTM" | "NGRT_READING", satOn: string, standardAgeScore: number, stanine: number) => ({
    organisationId,
    studentId,
    measure,
    academicYearStart: Number(satOn.slice(0, 4)) - (Number(satOn.slice(5, 7)) < 9 ? 1 : 0),
    satOn: new Date(`${satOn}T00:00:00Z`),
    standardAgeScore,
    stanine,
  });

  await database.assessmentResult.createMany({
    data: [
      result(student.id, "CAT4_MEAN", "2025-10-06", 96, 4),
      result(student.id, "CAT4_MEAN", "2026-10-05", 103, 5),
      result(student.id, "CAT4_QUANTITATIVE", "2026-10-05", 88, 3),
      { ...result(student.id, "PTM", "2026-06-15", 94, 4), rawScore: 37, rawScoreMaximum: 60, nationalPercentileRank: 34 },
      result(younger.id, "CAT4_MEAN", "2026-10-05", 120, 8),
    ],
  });

  async function cleanup() {
    const organisationIds = [organisationId, otherOrganisationId];
    await database.assessmentResult.deleteMany({ where: { organisationId: { in: organisationIds } } });
    await database.studentEnrolment.deleteMany({ where: { organisationId: { in: organisationIds } } });
    await database.student.deleteMany({ where: { organisationId: { in: organisationIds } } });
    await database.organisation.deleteMany({ where: { id: { in: organisationIds } } });
  }

  return { organisationId, otherOrganisationId, student: student.id, younger: younger.id, foreign: foreign.id, cleanup };
}

test("database rejects results that break assessment semantics", async () => {
  const fixtures = await createFixtures();

  try {
    const valid = {
      organisationId: fixtures.organisationId,
      studentId: fixtures.student,
      measure: "PTE" as const,
      academicYearStart: 2026,
      satOn: new Date("2026-11-02T00:00:00Z"),
      standardAgeScore: 100,
      stanine: 5,
    };

    await database.assessmentResult.create({ data: valid });

    for (const [label, data] of [
      ["duplicate sitting", valid],
      ["stanine 0", { ...valid, satOn: new Date("2026-11-03T00:00:00Z"), stanine: 0 }],
      ["stanine 10", { ...valid, satOn: new Date("2026-11-03T00:00:00Z"), stanine: 10 }],
      ["SAS below scale", { ...valid, satOn: new Date("2026-11-03T00:00:00Z"), standardAgeScore: 59 }],
      ["SAS above scale", { ...valid, satOn: new Date("2026-11-03T00:00:00Z"), standardAgeScore: 142 }],
      ["percentile 0", { ...valid, satOn: new Date("2026-11-03T00:00:00Z"), nationalPercentileRank: 0 }],
      ["percentile 100", { ...valid, satOn: new Date("2026-11-03T00:00:00Z"), nationalPercentileRank: 100 }],
      ["raw without maximum", { ...valid, satOn: new Date("2026-11-03T00:00:00Z"), rawScore: 10 }],
      ["raw above maximum", { ...valid, satOn: new Date("2026-11-03T00:00:00Z"), rawScore: 61, rawScoreMaximum: 60 }],
      ["sitting before the academic year", { ...valid, satOn: new Date("2026-08-31T00:00:00Z") }],
      ["sitting after the academic year", { ...valid, satOn: new Date("2027-09-01T00:00:00Z") }],
      ["student from another organisation", { ...valid, studentId: fixtures.foreign }],
    ] as const) {
      await assert.rejects(database.assessmentResult.create({ data: data }), undefined, label);
    }
  } finally {
    await fixtures.cleanup();
  }
});

test("returns the selected year's latest results with the previous sitting", async (context) => {
  const fixtures = await createFixtures();

  try {
    const url = await startApi(context, fixtures.organisationId, null);
    const response = await fetch(`${url}/students/${fixtures.student}/assessments?academicYearStart=2026`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), {
      academicYearStart: 2026,
      status: { value: "ON_TRACK", averageStandardAgeScore: 103, basedOn: ["CAT4_MEAN"] },
      priority: { value: "HIGH", standardAgeScore: 88, basedOn: "CAT4_QUANTITATIVE" },
      results: [
        {
          measure: "CAT4_QUANTITATIVE",
          satOn: "2026-10-05",
          rawScore: null,
          rawScoreMaximum: null,
          standardAgeScore: 88,
          stanine: 3,
          nationalPercentileRank: null,
          previous: null,
        },
        {
          measure: "CAT4_MEAN",
          satOn: "2026-10-05",
          rawScore: null,
          rawScoreMaximum: null,
          standardAgeScore: 103,
          stanine: 5,
          nationalPercentileRank: null,
          previous: { satOn: "2025-10-06", standardAgeScore: 96, stanine: 4 },
        },
      ],
    });

    const previousYear = await (await fetch(`${url}/students/${fixtures.student}/assessments?academicYearStart=2025`)).json();
    assert.deepEqual(
      previousYear.results.map(({ measure, rawScore, rawScoreMaximum, nationalPercentileRank }: Record<string, unknown>) =>
        [measure, rawScore, rawScoreMaximum, nationalPercentileRank]),
      [["CAT4_MEAN", null, null, null], ["PTM", 37, 60, 34]],
    );
  } finally {
    await fixtures.cleanup();
  }
});

test("hides other schools, other year groups and unenrolled years", async (context) => {
  const fixtures = await createFixtures();

  try {
    const wholeSchool = await startApi(context, fixtures.organisationId, null);
    const yearNine = await startApi(context, fixtures.organisationId, [9]);
    const otherSchool = await startApi(context, fixtures.otherOrganisationId, null);

    for (const [url, studentId, year, expected] of [
      [wholeSchool, fixtures.foreign, 2026, 404],
      [otherSchool, fixtures.student, 2026, 404],
      [yearNine, fixtures.younger, 2026, 404],
      [yearNine, fixtures.student, 2026, 200],
      [wholeSchool, fixtures.younger, 2025, 404],
      [wholeSchool, fixtures.student, 2024, 404],
    ] as const) {
      const response = await fetch(`${url}/students/${studentId}/assessments?academicYearStart=${year}`);
      assert.equal(response.status, expected, `${studentId} ${year}`);
    }

    for (const path of [
      `/students/not-a-uuid/assessments?academicYearStart=2026`,
      `/students/${fixtures.student}/assessments`,
      `/students/${fixtures.student}/assessments?academicYearStart=2026&organisationId=${fixtures.otherOrganisationId}`,
    ]) {
      assert.equal((await fetch(`${wholeSchool}${path}`)).status, 400, path);
    }
  } finally {
    await fixtures.cleanup();
  }
});
