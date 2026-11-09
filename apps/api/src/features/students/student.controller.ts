import type { RequestHandler, Response } from "express";
import { z } from "zod";
import { describeDatabaseError } from "../../database-errors.js";
import type { Logger } from "../../logger.js";
import type { StudentCursorCodec } from "./student.cursor.js";
import {
  createStudentPaginationSchema,
  studentDetailsQuerySchema,
} from "./student.pagination.js";
import type {
  findStudent,
  listAcademicYearStarts,
  StudentAccess,
} from "./student.repository.js";
import type { StudentService } from "./student.service.js";

type StudentControllerDependencies = {
  directory: StudentService;
  queryStudent: typeof findStudent;
  queryAcademicYearStarts: typeof listAcademicYearStarts;
  cursorCodec: StudentCursorCodec;
  logger: Logger;
};

const studentIdSchema = z.uuid();

function studentAccess(response: Response): StudentAccess {
  const { organisationId, yearGroups } = response.locals.actor;
  return { organisationId, yearGroups };
}

function rejectPagination(response: Response) {
  response.status(400).json({ error: "Invalid pagination" });
}

export function createStudentController({
  directory,
  queryStudent,
  queryAcademicYearStarts,
  cursorCodec,
  logger,
}: StudentControllerDependencies) {
  const paginationSchema = createStudentPaginationSchema(cursorCodec);

  function respondUnavailable(response: Response, event: string, error: unknown) {
    logger.error(event, {
      requestId: response.locals.requestId,
      ...describeDatabaseError(error),
    });
    response.status(503).json({ error: "Student directory unavailable" });
  }

  const listAcademicYears: RequestHandler = async (request, response) => {
    if (Object.keys(request.query).length > 0) {
      rejectPagination(response);
      return;
    }

    try {
      response.json({ academicYearStarts: await queryAcademicYearStarts(studentAccess(response)) });
    } catch (error) {
      respondUnavailable(response, "students.academic_years_failed", error);
    }
  };

  const findStudent: RequestHandler = async (request, response) => {
    const studentId = studentIdSchema.safeParse(request.params.studentId);
    const query = studentDetailsQuerySchema.safeParse(request.query);

    if (!studentId.success || !query.success) {
      response.status(400).json({ error: "Invalid student request" });
      return;
    }

    try {
      const student = await queryStudent({
        access: studentAccess(response),
        studentId: studentId.data,
        academicYearStart: query.data.academicYearStart,
      });

      if (!student) {
        response.status(404).json({ error: "Student not found" });
        return;
      }

      response.json(student);
    } catch (error) {
      respondUnavailable(response, "students.details_failed", error);
    }
  };

  const listDirectory: RequestHandler = async (request, response) => {
    const pagination = paginationSchema.safeParse(request.query);

    if (!pagination.success) {
      rejectPagination(response);
      return;
    }

    const { q, limit, ...query } = pagination.data;

    try {
      const result = await directory.listDirectory(studentAccess(response), {
        ...query,
        limit,
        search: q || undefined,
      });

      if (result.status === "invalid-cursor") {
        rejectPagination(response);
        return;
      }

      response.json({ items: result.items, nextCursor: result.nextCursor, limit });
    } catch (error) {
      respondUnavailable(response, "students.list_failed", error);
    }
  };

  return { listAcademicYears, findStudent, listDirectory };
}

export type StudentController = ReturnType<typeof createStudentController>;
