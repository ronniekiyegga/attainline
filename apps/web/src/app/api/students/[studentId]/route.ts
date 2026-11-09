import { z } from "zod";
import { academicYearParamSchema } from "@/features/students/academic-year";
import { getStudentDetails } from "@/features/students/student.api";

const studentIdSchema = z.uuid();

function respond(status: number, body: unknown) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const { searchParams } = new URL(request.url);
  const id = studentIdSchema.safeParse(studentId);
  const year = academicYearParamSchema.safeParse(
    searchParams.getAll("year").length === 1 ? searchParams.get("year") : undefined,
  );

  if (!id.success || !year.success || year.data === undefined) {
    return respond(400, { error: "Invalid student request" });
  }

  const result = await getStudentDetails({
    studentId: id.data,
    academicYearStart: year.data,
  });

  if (result.status === "not-found") {
    return respond(404, { error: "Student not found" });
  }

  if (result.status === "unavailable") {
    return respond(503, { error: "Student details unavailable" });
  }

  return respond(200, result.data);
}
