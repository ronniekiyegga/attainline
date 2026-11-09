import { database } from "../../database.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { StudentSort } from "./student.sort.js";

type StudentKey = {
  surname: string;
  id: string;
};

type ListStudentsOptions = {
  organisationId: string;
  academicYearStart: number;
  sort: StudentSort;
  limit: number;
  after?: StudentKey;
  search?: string;
};

type FindStudentOptions = {
  organisationId: string;
  academicYearStart: number;
  studentId: string;
};

function escapeLikePattern(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

function matchesSearch(search: string): Prisma.StudentWhereInput {
  const contains = {
    contains: escapeLikePattern(search),
    mode: "insensitive",
  } as const;

  return {
    OR: [
      { firstName: contains },
      { surname: contains },
      { institutionStudentRef: contains },
    ],
  };
}

function isAfter(
  { surname, id }: StudentKey,
  direction: Prisma.SortOrder,
): Prisma.StudentWhereInput {
  const beyond = direction === "asc" ? "gt" : "lt";

  return {
    OR: [
      { surname: { [beyond]: surname } },
      { surname, id: { [beyond]: id } },
    ],
  };
}

function placementSelect(academicYearStart: number) {
  return {
    id: true,
    institutionStudentRef: true,
    firstName: true,
    surname: true,
    enrolments: {
      where: { academicYearStart },
      select: { yearGroup: true, classGroup: true },
      take: 1,
    },
  } satisfies Prisma.StudentSelect;
}

type StudentWithEnrolments = Prisma.StudentGetPayload<{
  select: ReturnType<typeof placementSelect>;
}>;

function withPlacement({ enrolments: [placement], ...student }: StudentWithEnrolments) {
  if (!placement) {
    throw new Error("Student has no placement for the requested year");
  }

  return { ...student, ...placement };
}

export async function listAcademicYearStarts(
  organisationId: string,
): Promise<number[]> {
  const years = await database.studentEnrolment.groupBy({
    by: ["academicYearStart"],
    where: { organisationId },
    orderBy: { academicYearStart: "desc" },
  });

  return years.map((year) => year.academicYearStart);
}

export async function listStudents({
  organisationId,
  academicYearStart,
  sort,
  limit,
  after,
  search,
}: ListStudentsOptions) {
  const direction: Prisma.SortOrder = sort === "surname-desc" ? "desc" : "asc";
  const conditions: Prisma.StudentWhereInput[] = [
    { enrolments: { some: { academicYearStart } } },
  ];

  if (search) {
    conditions.push(matchesSearch(search));
  }

  if (after) {
    conditions.push(isAfter(after, direction));
  }

  const students = await database.$transaction(
    (transaction) => transaction.student.findMany({
      where: { organisationId, AND: conditions },
      select: placementSelect(academicYearStart),
      orderBy: [{ surname: direction }, { id: direction }],
      take: limit + 1,
    }),
    { isolationLevel: "RepeatableRead" },
  );

  const page = students.slice(0, limit);
  const lastStudent = page.at(-1);

  const next: StudentKey | null = students.length > limit && lastStudent
    ? { surname: lastStudent.surname, id: lastStudent.id }
    : null;

  return { items: page.map(withPlacement), next };
}

export async function findStudent({
  organisationId,
  academicYearStart,
  studentId,
}: FindStudentOptions) {
  const student = await database.$transaction(
    (transaction) => transaction.student.findFirst({
      where: {
        id: studentId,
        organisationId,
        enrolments: { some: { academicYearStart } },
      },
      select: placementSelect(academicYearStart),
    }),
    { isolationLevel: "RepeatableRead" },
  );

  return student && withPlacement(student);
}
