import { searchHash, type StudentCursor, type StudentCursorCodec } from "./student.cursor.js";
import type {
  findStudent,
  listAcademicYearStarts,
  listStudents,
  StudentAccess,
} from "./student.repository.js";
import type { StudentSort } from "./student.sort.js";

type StudentServiceDependencies = {
  queryStudents: typeof listStudents;
  queryStudent: typeof findStudent;
  queryAcademicYearStarts: typeof listAcademicYearStarts;
  cursorCodec: StudentCursorCodec;
};

export type DirectoryQuery = {
  academicYearStart: number;
  sort: StudentSort;
  limit: number;
  cursor?: StudentCursor;
  search?: string;
};

export type StudentService = ReturnType<typeof createStudentService>;

export function createStudentService({
  queryStudents,
  queryStudent,
  queryAcademicYearStarts,
  cursorCodec,
}: StudentServiceDependencies) {
  async function listDirectory(
    access: StudentAccess,
    { academicYearStart, sort, limit, cursor, search }: DirectoryQuery,
  ) {
    const boundSearch = searchHash(search);

    if (
      cursor &&
      (cursor.organisationId !== access.organisationId ||
        cursor.academicYearStart !== academicYearStart ||
        cursor.sort !== sort ||
        cursor.searchHash !== boundSearch)
    ) {
      return { status: "invalid-cursor" } as const;
    }

    const page = await queryStudents({
      access,
      academicYearStart,
      sort,
      limit,
      after: cursor && { surname: cursor.surname, id: cursor.id },
      ...(search && { search }),
    });

    const nextCursor = page.next
      ? cursorCodec.encode({
          organisationId: access.organisationId,
          academicYearStart,
          sort,
          ...page.next,
          ...(boundSearch && { searchHash: boundSearch }),
        })
      : null;

    return { status: "listed", items: page.items, nextCursor } as const;
  }

  return {
    listDirectory,
    listAcademicYears: (access: StudentAccess) => queryAcademicYearStarts(access),
    findStudent: (access: StudentAccess, studentId: string, academicYearStart: number) =>
      queryStudent({ access, studentId, academicYearStart }),
  };
}
