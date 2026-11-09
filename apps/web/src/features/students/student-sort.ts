import { z } from "zod";

export const STUDENT_SORTS = ["surname-asc", "surname-desc"] as const;

export type StudentSort = (typeof STUDENT_SORTS)[number];

export const DEFAULT_STUDENT_SORT: StudentSort = "surname-asc";

export const studentSortParamSchema = z.enum(STUDENT_SORTS)
  .default(DEFAULT_STUDENT_SORT);
