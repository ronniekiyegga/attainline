import { z } from "zod";
import { RANKING_MEASURES } from "../assessments/assessment.indicators.js";

const academicYearStartSchema = z.coerce.number().int().min(2000).max(2200);

const overviewQuerySchema = z.strictObject({
  academicYearStart: academicYearStartSchema,
});

const rankingsQuerySchema = z.strictObject({
  academicYearStart: academicYearStartSchema,
  measure: z.enum(RANKING_MEASURES).default("CAT4_MEAN"),
  yearGroup: z.coerce.number().int().min(1).max(14).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export function parseOverviewQuery(input: unknown) {
  const result = overviewQuerySchema.safeParse(input);
  return result.success ? result.data : null;
}

export function parseRankingsQuery(input: unknown) {
  const result = rankingsQuerySchema.safeParse(input);
  return result.success ? result.data : null;
}
