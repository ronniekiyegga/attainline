import "server-only";
import { redirect } from "next/navigation";
import { readSessionToken } from "@/features/auth/session";
import { requestApi } from "@/server/attainline-api";
import {
  overviewSchema,
  rankingsSchema,
  type RankingMeasure,
} from "./analytics.schema";

export type AnalyticsResult<T> =
  | { status: "success"; data: T }
  | { status: "forbidden" }
  | { status: "unavailable" };

async function authenticatedResult<T>(
  result: Awaited<ReturnType<typeof requestApi<T>>>,
): Promise<AnalyticsResult<T>> {
  if (result.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (result.status === "rejected" && result.httpStatus === 403) {
    return { status: "forbidden" };
  }

  return result.status === "success" ? result : { status: "unavailable" };
}

export async function getAnalyticsOverview(academicYearStart: number) {
  return authenticatedResult(await requestApi({
    path: "analytics/overview",
    query: { academicYearStart: String(academicYearStart) },
    sessionToken: await readSessionToken(),
    schema: overviewSchema,
  }));
}

export async function getRankings(options: {
  academicYearStart: number;
  measure: RankingMeasure;
  yearGroup?: number;
  page: number;
  limit?: number;
}) {
  return authenticatedResult(await requestApi({
    path: "analytics/rankings",
    query: {
      academicYearStart: String(options.academicYearStart),
      measure: options.measure,
      yearGroup: options.yearGroup === undefined ? undefined : String(options.yearGroup),
      page: String(options.page),
      limit: String(options.limit ?? 10),
    },
    sessionToken: await readSessionToken(),
    schema: rankingsSchema,
    expectedStatuses: [403],
  }));
}
