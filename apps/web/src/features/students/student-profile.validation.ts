import { z } from "zod";
import { academicYearParamSchema } from "./academic-year";

const studentIdSchema = z.uuid();

export function parseStudentProfileRequest(studentId: unknown, year: unknown) {
  const parsedStudentId = studentIdSchema.safeParse(studentId);
  const parsedYear = academicYearParamSchema.safeParse(year);

  if (!parsedStudentId.success || !parsedYear.success || parsedYear.data === undefined) {
    return null;
  }

  return { studentId: parsedStudentId.data, year: parsedYear.data };
}
