import { z } from "zod";
import { academicYearStartSchema } from "@/features/students/academic-year";
import { studentDetailsSchema } from "@/features/students/student-page.schema";

export const RANKING_MEASURES = [
  "CAT4_MEAN",
  "CAT4_VERBAL",
  "CAT4_QUANTITATIVE",
  "CAT4_NON_VERBAL",
  "CAT4_SPATIAL",
  "NGRT_READING",
  "PTE",
  "PTM",
  "PTS",
] as const;

export const rankingMeasureSchema = z.enum(RANKING_MEASURES);
export type RankingMeasure = z.infer<typeof rankingMeasureSchema>;

export const statusSchema = z.enum(["ON_TRACK", "AT_RISK", "PENDING", "OFF_TRACK"]);
export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

const rankingItemSchema = studentDetailsSchema.omit({ institutionStudentRef: true }).extend({
  rank: z.number().int().positive(),
  standardAgeScore: z.number().int().min(60).max(141),
  stanine: z.number().int().min(1).max(9),
  nationalPercentileRank: z.number().int().min(1).max(99).nullable(),
  status: statusSchema,
  priority: prioritySchema,
});

export const overviewSchema = z.object({
  academicYearStart: academicYearStartSchema,
  cohortSize: z.number().int().nonnegative(),
  assessedStudents: z.number().int().nonnegative(),
  coveragePercentage: z.number().min(0).max(100),
  onTrackPercentage: z.number().min(0).max(100),
  averageStandardAgeScore: z.number().min(60).max(141).nullable(),
  statusCounts: z.object({
    ON_TRACK: z.number().int().nonnegative(),
    AT_RISK: z.number().int().nonnegative(),
    PENDING: z.number().int().nonnegative(),
    OFF_TRACK: z.number().int().nonnegative(),
  }),
  priorityCounts: z.object({
    LOW: z.number().int().nonnegative(),
    MEDIUM: z.number().int().nonnegative(),
    HIGH: z.number().int().nonnegative(),
  }),
  yearGroups: z.array(z.object({
    yearGroup: z.number().int().positive(),
    students: z.number().int().positive(),
  })),
  measures: z.array(z.object({
    measure: rankingMeasureSchema,
    students: z.number().int().positive(),
    averageStandardAgeScore: z.number().min(60).max(141),
    averageStanine: z.number().min(1).max(9),
  })),
  topRankings: z.array(rankingItemSchema).max(5),
});

export const rankingsSchema = z.object({
  academicYearStart: academicYearStartSchema,
  measure: rankingMeasureSchema,
  yearGroup: z.number().int().positive().nullable(),
  cohortSize: z.number().int().nonnegative(),
  availableYearGroups: z.array(z.number().int().positive()),
  items: z.array(rankingItemSchema).max(50),
  page: z.number().int().positive(),
  limit: z.number().int().min(1).max(50),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type AnalyticsOverview = z.infer<typeof overviewSchema>;
export type RankingPage = z.infer<typeof rankingsSchema>;
export type RankingItem = z.infer<typeof rankingItemSchema>;
