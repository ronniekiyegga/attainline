import { z } from "zod";
import { rankingMeasureSchema } from "./analytics.schema";

const rankingsQuerySchema = z.object({
  measure: rankingMeasureSchema.default("CAT4_MEAN"),
  yearGroup: z
    .string()
    .regex(/^\d{1,2}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(14))
    .optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(10_000))
    .default(1),
});

export function parseRankingsQuery(
  parameters: Record<string, string | string[] | undefined>,
) {
  return rankingsQuerySchema.safeParse({
    measure: parameters.measure,
    yearGroup: parameters.yearGroup || undefined,
    page: parameters.page,
  });
}
