export const STUDENT_SORTS = ["surname-asc", "surname-desc"] as const;

export type StudentSort = (typeof STUDENT_SORTS)[number];

export const DEFAULT_STUDENT_SORT: StudentSort = "surname-asc";
