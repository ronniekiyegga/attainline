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

type DemoMeasure =
  | "CAT4_VERBAL"
  | "CAT4_QUANTITATIVE"
  | "CAT4_NON_VERBAL"
  | "CAT4_SPATIAL"
  | "CAT4_MEAN"
  | "NGRT_READING"
  | "PTE"
  | "PTM"
  | "PTS";

type DemoSitting = {
  measure: DemoMeasure;
  month: number;
  day: number;
  rawScoreMaximum?: number;
};

const CAT4_BATTERIES: DemoMeasure[] = ["CAT4_VERBAL", "CAT4_QUANTITATIVE", "CAT4_NON_VERBAL", "CAT4_SPATIAL"];

const demoSittings: Record<number, DemoSitting[]> = {
  2025: [
    ...CAT4_BATTERIES.map((measure) => ({ measure, month: 10, day: 6 })),
    { measure: "NGRT_READING", month: 10, day: 8 },
    { measure: "PTE", month: 6, day: 15, rawScoreMaximum: 50 },
    { measure: "PTM", month: 6, day: 16, rawScoreMaximum: 60 },
    { measure: "PTS", month: 6, day: 17, rawScoreMaximum: 50 },
  ],
  2026: [
    ...CAT4_BATTERIES.map((measure) => ({ measure, month: 10, day: 5 })),
    { measure: "NGRT_READING", month: 10, day: 7 },
  ],
};

const STANINE_UPPER_BOUNDS = [73, 81, 88, 96, 103, 111, 118, 126];

export function stanineFor(standardAgeScore: number): number {
  return STANINE_UPPER_BOUNDS.findIndex((bound) => standardAgeScore <= bound) + 1 || 9;
}

function normalCumulative(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const density = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  const tail = density * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - tail : tail;
}

export function percentileFor(standardAgeScore: number): number {
  return Math.min(99, Math.max(1, Math.round(100 * normalCumulative((standardAgeScore - 100) / 15))));
}

function demoStandardAgeScore(referenceNumber: number, measure: DemoMeasure, academicYearStart: number): number {
  const measureIndex = [...CAT4_BATTERIES, "NGRT_READING", "PTE", "PTM", "PTS"].indexOf(measure);
  const ability = ((referenceNumber * 23) % 37) - 18;
  const measureVariation = ((referenceNumber * 7 + measureIndex * 11) % 13) - 6;
  const yearVariation = ((referenceNumber + academicYearStart + measureIndex * 3) % 9) - 4;
  return 100 + ability + measureVariation + yearVariation;
}

export function demoAssessmentResults(
  organisationId: string,
  students: { id: string; institutionStudentRef: string }[],
  academicYearStart: number,
) {
  return students.flatMap((student) => {
    if (!demoPlacement(student.institutionStudentRef, academicYearStart)) {
      return [];
    }

    const referenceNumber = Number(referencePattern.exec(student.institutionStudentRef)?.[1]);

    const sittings = (demoSittings[academicYearStart] ?? []).map(({ measure, month, day, rawScoreMaximum }) => {
      const standardAgeScore = demoStandardAgeScore(referenceNumber, measure, academicYearStart);
      const year = month >= 9 ? academicYearStart : academicYearStart + 1;

      return {
        organisationId,
        studentId: student.id,
        measure,
        academicYearStart,
        satOn: new Date(Date.UTC(year, month - 1, day)),
        standardAgeScore,
        stanine: stanineFor(standardAgeScore),
        nationalPercentileRank: percentileFor(standardAgeScore),
        rawScore: rawScoreMaximum === undefined
          ? null
          : Math.round(rawScoreMaximum * (standardAgeScore - 60) / 81),
        rawScoreMaximum: rawScoreMaximum ?? null,
      };
    });

    const batteries = sittings.filter(({ measure }) => CAT4_BATTERIES.includes(measure));

    if (batteries.length === 0) {
      return sittings;
    }

    const meanScore = Math.round(
      batteries.reduce((sum, { standardAgeScore }) => sum + standardAgeScore, 0) / batteries.length,
    );

    return [
      ...sittings,
      {
        ...batteries[0],
        measure: "CAT4_MEAN" as const,
        standardAgeScore: meanScore,
        stanine: stanineFor(meanScore),
        nationalPercentileRank: percentileFor(meanScore),
      },
    ];
  });
}
