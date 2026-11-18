import { academicYearParamSchema } from "./academic-year";
import { studentSearchSchema } from "./student-search.schema";
import { studentSortParamSchema } from "./student-sort";

export function parseStudentDirectoryRequest(
  parameters: Record<string, string | string[] | undefined>,
) {
  const parsedSearch = studentSearchSchema.safeParse(parameters.q);
  if (!parsedSearch.success) return { status: "invalid-search" } as const;

  const search = parsedSearch.data || undefined;
  const requestedYear = academicYearParamSchema.safeParse(parameters.year);
  const parsedSort = studentSortParamSchema.safeParse(parameters.sort);

  if (!requestedYear.success) {
    return {
      status: "invalid-year",
      search,
      sort: parsedSort.success ? parsedSort.data : undefined,
    } as const;
  }

  if (!parsedSort.success) {
    return { status: "invalid-sort", year: requestedYear.data, search } as const;
  }

  const { cursor } = parameters;
  if (cursor !== undefined && (typeof cursor !== "string" || cursor === "")) {
    return {
      status: "invalid-cursor",
      year: requestedYear.data,
      search,
      sort: parsedSort.data,
    } as const;
  }

  return {
    status: "success",
    year: requestedYear.data,
    search,
    sort: parsedSort.data,
    cursor,
  } as const;
}
