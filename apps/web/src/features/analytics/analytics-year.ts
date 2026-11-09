import "server-only";
import { academicYearParamSchema } from "@/features/students/academic-year";
import { getAcademicYears } from "@/features/students/student.api";

export type DashboardSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function resolveAnalyticsYear(searchParams: DashboardSearchParams) {
  const [parameters, years] = await Promise.all([searchParams, getAcademicYears()]);

  if (years.status === "unavailable") {
    return { status: "unavailable" } as const;
  }

  const requested = academicYearParamSchema.safeParse(parameters.year);
  if (!requested.success) {
    return { status: "invalid", years: years.data } as const;
  }

  const [newestYear] = years.data;
  if (newestYear === undefined) {
    return { status: "empty", years: [] } as const;
  }

  const year = requested.data ?? newestYear;
  if (!years.data.includes(year)) {
    return { status: "invalid", years: years.data } as const;
  }

  return { status: "success", year, years: years.data, parameters } as const;
}
