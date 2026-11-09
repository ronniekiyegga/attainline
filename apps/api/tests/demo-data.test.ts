import assert from "node:assert/strict";
import { test } from "node:test";
import {
  demoAssessmentResults,
  demoEnrolments,
  demoOrganisations,
  demoPlacement,
  demoReference,
  demoStaff,
  demoStudents,
  percentileFor,
  stanineFor,
} from "../scripts/demo-data.js";

const [academy] = demoOrganisations;

function storedStudents() {
  return demoStudents(academy.id, academy.prefix, academy.students).map(
    (student, index) => ({
      id: `student-${index + 1}`,
      institutionStudentRef: student.institutionStudentRef,
    }),
  );
}

test("pairs each enrolment with its student's reference, whatever the query order", () => {
  const stored = storedStudents();
  const reversedWithGap = stored.toReversed().filter((_, index) => index !== 7);

  for (const year of [2025, 2026]) {
    const inOrder = new Map(
      demoEnrolments(academy.id, stored, year).map((row) => [row.studentId, row]),
    );

    for (const row of demoEnrolments(academy.id, reversedWithGap, year)) {
      assert.deepEqual(row, inOrder.get(row.studentId));
    }
  }
});

test("keeps existing current-year placements and gives returning students an earlier one", () => {
  assert.deepEqual(demoPlacement(demoReference("A", 1), 2026), { yearGroup: 7, classGroup: "7A" });
  assert.deepEqual(demoPlacement(demoReference("A", 2), 2026), { yearGroup: 8, classGroup: "8B" });
  assert.equal(demoPlacement(demoReference("A", 1), 2025), null);
  assert.deepEqual(demoPlacement(demoReference("A", 2), 2025), { yearGroup: 7, classGroup: "7C" });
});

test("demo data includes missing classes and repeated surnames", () => {
  const placements2025 = demoEnrolments(academy.id, storedStudents(), 2025);
  assert.ok(placements2025.some((row) => row.classGroup === null));
  assert.ok(placements2025.length < academy.students);

  const surnames = demoStudents(academy.id, academy.prefix, academy.students)
    .map((student) => student.surname);
  assert.ok(new Set(surnames).size < surnames.length);
});

test("rejects references outside the demo format", () => {
  assert.throws(() => demoPlacement("REAL-123", 2026));
});

test("demo staff use reserved addresses and valid memberships", () => {
  const organisationIds = new Set(demoOrganisations.map(({ id }) => id));
  const emails = demoStaff.map(({ email }) => email);

  assert.equal(new Set(emails).size, emails.length);

  for (const staff of demoStaff) {
    assert.equal(staff.email, staff.email.trim().toLowerCase());
    assert.match(staff.email, /^[a-z.]+@example\.test$/);
    assert.ok(staff.memberships.length > 0);

    for (const membership of staff.memberships) {
      assert.ok(organisationIds.has(membership.organisationId));
      assert.ok(membership.yearGroups.every((yearGroup) => yearGroup > 0));
      assert.equal(membership.role === "HEADTEACHER", membership.yearGroups.length === 0);
    }
  }
});

test("maps standard age scores to the standard stanine bands and percentiles", () => {
  for (const [score, stanine] of [
    [60, 1], [73, 1], [74, 2], [81, 2], [82, 3], [88, 3], [89, 4], [96, 4],
    [97, 5], [103, 5], [104, 6], [111, 6], [112, 7], [118, 7], [119, 8], [126, 8], [127, 9], [141, 9],
  ]) {
    assert.equal(stanineFor(score), stanine, String(score));
  }

  assert.equal(percentileFor(100), 50);
  assert.equal(percentileFor(115), 84);
  assert.equal(percentileFor(85), 16);
  assert.equal(percentileFor(60), 1);
  assert.equal(percentileFor(141), 99);
});

test("demo assessment results respect the database rules and enrolments", () => {
  const stored = storedStudents();

  for (const year of [2025, 2026]) {
    const results = demoAssessmentResults(academy.id, stored, year);
    const enrolled = new Set(demoEnrolments(academy.id, stored, year).map(({ studentId }) => studentId));
    const sittings = new Set<string>();

    assert.ok(results.length > 0);

    for (const result of results) {
      const key = `${result.studentId}:${result.measure}:${result.satOn.toISOString()}`;
      assert.ok(!sittings.has(key), key);
      sittings.add(key);

      assert.ok(enrolled.has(result.studentId));
      assert.ok(result.satOn >= new Date(Date.UTC(year, 8, 1)) && result.satOn < new Date(Date.UTC(year + 1, 8, 1)));
      assert.ok(result.satOn <= new Date(Date.UTC(2026, 10, 9)), "no sittings after the demo date");
      assert.ok(result.standardAgeScore >= 60 && result.standardAgeScore <= 141);
      assert.equal(result.stanine, stanineFor(result.standardAgeScore));
      assert.ok(result.nationalPercentileRank >= 1 && result.nationalPercentileRank <= 99);
      assert.equal(result.rawScore === null, result.rawScoreMaximum === null);
      if (result.rawScore !== null && result.rawScoreMaximum !== null) {
        assert.ok(result.rawScore >= 0 && result.rawScore <= result.rawScoreMaximum);
      }
    }
  }

  const statuses = new Set(
    demoAssessmentResults(academy.id, stored, 2026)
      .filter(({ measure }) => measure === "CAT4_MEAN")
      .map(({ standardAgeScore }) => standardAgeScore >= 100 ? "on" : standardAgeScore >= 90 ? "mid" : "off"),
  );
  assert.deepEqual([...statuses].sort(), ["mid", "off", "on"]);
});
