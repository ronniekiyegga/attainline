import assert from "node:assert/strict";
import { test } from "node:test";
import {
  demoEnrolments,
  demoOrganisations,
  demoPlacement,
  demoReference,
  demoStudents,
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
