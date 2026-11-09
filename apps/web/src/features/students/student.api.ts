import "server-only";
import { redirect } from "next/navigation";
import { readSessionToken } from "@/features/auth/session";
import { requestApi } from "@/server/attainline-api";
import {
  academicYearsSchema,
  studentPageSchema,
  type StudentPage,
} from "./student-page.schema";
import type { StudentSort } from "./student-sort";

const PAGE_SIZE = "25";

export type AcademicYearsResult =
  | { status: "success"; data: number[] }
  | { status: "unavailable" };

export type StudentPageResult =
  | { status: "success"; data: StudentPage }
  | { status: "invalid-cursor" }
  | { status: "unavailable" };

export async function getAcademicYears(): Promise<AcademicYearsResult> {
  const result = await requestApi({
    path: "students/academic-years",
    sessionToken: await readSessionToken(),
    schema: academicYearsSchema,
  });

  if (result.status === "unauthenticated") {
    redirect("/sign-in");
  }

  return result.status === "success"
    ? { status: "success", data: result.data.academicYearStarts }
    : { status: "unavailable" };
}

type StudentPageQuery = {
  academicYearStart: number;
  sort: StudentSort;
  cursor?: string;
  search?: string;
};

export async function getStudents({
  academicYearStart,
  sort,
  cursor,
  search,
}: StudentPageQuery): Promise<StudentPageResult> {
  const result = await requestApi({
    path: "students",
    query: {
      academicYearStart: String(academicYearStart),
      sort,
      limit: PAGE_SIZE,
      q: search,
      cursor,
    },
    sessionToken: await readSessionToken(),
    schema: studentPageSchema,
    expectedStatuses: cursor ? [400] : [],
  });

  if (result.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (result.status === "rejected") {
    return { status: "invalid-cursor" };
  }

  return result.status === "success" ? result : { status: "unavailable" };
}
