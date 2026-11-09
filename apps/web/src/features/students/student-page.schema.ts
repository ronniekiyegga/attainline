import { z } from "zod";
import { academicYearStartSchema } from "./academic-year";

export const academicYearsSchema = z.object({
  academicYearStarts: z.array(academicYearStartSchema).refine(
    (years) => years.every((year, index) => index === 0 || year < years[index - 1]),
    "Academic years must be unique and newest first",
  ),
});

export const studentDetailsSchema = z.object({
  id: z.uuid(),
  institutionStudentRef: z.string(),
  firstName: z.string().nullable(),
  surname: z.string(),
  yearGroup: z.number().int().positive(),
  classGroup: z.string().nullable(),
});

export const studentPageSchema = z.object({
  items: z.array(studentDetailsSchema).max(100),
  nextCursor: z.string().min(1).nullable(),
  limit: z.number().int().min(1).max(100),
});

export type StudentPage = z.infer<typeof studentPageSchema>;
export type StudentDetails = z.infer<typeof studentDetailsSchema>;

export const ASSESSMENT_MEASURES = [
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

const measureSchema = z.enum(ASSESSMENT_MEASURES);
const isoDateSchema = z.iso.date();
const standardAgeScoreSchema = z.number().int().min(60).max(141);
const stanineSchema = z.number().int().min(1).max(9);

export const studentAssessmentsSchema = z.object({
  academicYearStart: z.number().int(),
  status: z.object({
    value: z.enum(["ON_TRACK", "AT_RISK", "PENDING", "OFF_TRACK"]),
    averageStandardAgeScore: z.number().nullable(),
    basedOn: z.array(measureSchema),
  }),
  priority: z.object({
    value: z.enum(["LOW", "MEDIUM", "HIGH"]),
    standardAgeScore: standardAgeScoreSchema.nullable(),
    basedOn: measureSchema.nullable(),
  }),
  results: z.array(z.object({
    measure: measureSchema,
    satOn: isoDateSchema,
    rawScore: z.number().int().nonnegative().nullable(),
    rawScoreMaximum: z.number().int().positive().nullable(),
    standardAgeScore: standardAgeScoreSchema,
    stanine: stanineSchema,
    nationalPercentileRank: z.number().int().min(1).max(99).nullable(),
    previous: z.object({
      satOn: isoDateSchema,
      standardAgeScore: standardAgeScoreSchema,
      stanine: stanineSchema,
    }).nullable(),
  })),
});

export type StudentAssessments = z.infer<typeof studentAssessmentsSchema>;
export type AssessmentMeasure = (typeof ASSESSMENT_MEASURES)[number];
