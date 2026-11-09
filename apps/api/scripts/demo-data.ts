export const DEMO_ACADEMIC_YEAR_STARTS = [2025, 2026] as const;

const CURRENT_ACADEMIC_YEAR_START = 2026;

export const demoOrganisations = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Fictional Demo Academy", prefix: "A", students: 60 },
  { id: "22222222-2222-4222-8222-222222222222", name: "Fictional Demo College", prefix: "B", students: 5 },
];

const firstNames = [
  "Avery", "Bodhi", "Calla", "Dashiell", "Elowen", "Fenwick",
  "Greer", "Halden", "Isolde", "Jory", "Kestrel", "Linnea",
];

const surnames = [
  "Ashgrove", "Brackenridge", "Cindermoor", "Dunmerrow", "Ellwood",
  "Foxwhistle", "Glenhallow", "Hollowmere", "Inkersall", "Juniperlea",
];

const referencePattern = /^DEMO-[A-Z]-(\d{3})$/;

export function demoReference(prefix: string, number: number): string {
  return `DEMO-${prefix}-${String(number).padStart(3, "0")}`;
}

export function demoStudents(organisationId: string, prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    organisationId,
    institutionStudentRef: demoReference(prefix, index + 1),
    firstName: index % 11 === 10 ? null : firstNames[index % firstNames.length],
    surname: surnames[(index * 7) % surnames.length],
  }));
}

export type DemoPlacement = {
  yearGroup: number;
  classGroup: string | null;
};

export function demoPlacement(
  institutionStudentRef: string,
  academicYearStart: number,
): DemoPlacement | null {
  const match = referencePattern.exec(institutionStudentRef);

  if (!match) {
    throw new Error(`Not a demo student reference: ${institutionStudentRef}`);
  }

  const number = Number(match[1]);
  const currentYearGroup = 7 + ((number - 1) % 5);
  const yearGroup = currentYearGroup - (CURRENT_ACADEMIC_YEAR_START - academicYearStart);

  if (yearGroup < 7) {
    return null;
  }

  const classGroup = academicYearStart === CURRENT_ACADEMIC_YEAR_START
    ? `${yearGroup}${"ABC"[(number - 1) % 3]}`
    : number % 7 === 0
      ? null
      : `${yearGroup}${"ABC"[number % 3]}`;

  return { yearGroup, classGroup };
}

export function demoEnrolments(
  organisationId: string,
  students: { id: string; institutionStudentRef: string }[],
  academicYearStart: number,
) {
  return students.flatMap((student) => {
    const placement = demoPlacement(student.institutionStudentRef, academicYearStart);

    return placement
      ? [{ organisationId, studentId: student.id, academicYearStart, ...placement }]
      : [];
  });
}

type DemoStaffMembership = {
  organisationId: string;
  role: "HEADTEACHER" | "HEAD_OF_YEAR" | "TEACHER";
  yearGroups: number[];
};

export type DemoStaff = {
  email: string;
  displayName: string;
  memberships: DemoStaffMembership[];
};

const [academy, college] = demoOrganisations;

export const demoStaff: DemoStaff[] = [
  {
    email: "morgan.vale@example.test",
    displayName: "Morgan Vale",
    memberships: [
      { organisationId: academy.id, role: "HEADTEACHER", yearGroups: [] },
      { organisationId: college.id, role: "HEADTEACHER", yearGroups: [] },
    ],
  },
  {
    email: "rowan.thistle@example.test",
    displayName: "Rowan Thistle",
    memberships: [
      { organisationId: academy.id, role: "HEAD_OF_YEAR", yearGroups: [9] },
    ],
  },
  {
    email: "sasha.wren@example.test",
    displayName: "Sasha Wren",
    memberships: [
      { organisationId: academy.id, role: "TEACHER", yearGroups: [7, 8] },
    ],
  },
];
