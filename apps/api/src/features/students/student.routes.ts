import { Router, type Response } from "express";
import { z } from "zod";
import { describeDatabaseError } from "../../database-errors.js";
import type { Logger } from "../../logger.js";
import { searchHash, type StudentCursorCodec } from "./student.cursor.js";
import {
  createStudentPaginationSchema,
  studentDetailsQuerySchema,
} from "./student.pagination.js";
import type {
  findStudent,
  listAcademicYearStarts,
  listStudents,
} from "./student.repository.js";

type StudentRouterDependencies = {
  organisationId: string;
  queryStudents: typeof listStudents;
  queryStudent: typeof findStudent;
  queryAcademicYearStarts: typeof listAcademicYearStarts;
  cursorCodec: StudentCursorCodec;
  logger: Logger;
};

const studentIdSchema = z.uuid();

function rejectPagination(response: Response) {
  response.status(400).json({ error: "Invalid pagination" });
}

export function createStudentRouter({
  organisationId,
  queryStudents,
  queryStudent,
  queryAcademicYearStarts,
  cursorCodec,
  logger,
}: StudentRouterDependencies) {
  const router = Router();
  const paginationSchema = createStudentPaginationSchema(cursorCodec);

  function respondUnavailable(
    response: Response,
    event: string,
    error: unknown,
  ) {
    logger.error(event, {
      requestId: response.locals.requestId,
      ...describeDatabaseError(error),
    });
    response.status(503).json({
      error: "Student directory unavailable",
    });
  }

  router.get("/academic-years", async (request, response) => {
    response.set("Cache-Control", "no-store");

    if (Object.keys(request.query).length > 0) {
      rejectPagination(response);
      return;
    }

    try {
      const academicYearStarts = await queryAcademicYearStarts(organisationId);
      response.json({ academicYearStarts });
    } catch (error) {
      respondUnavailable(response, "students.academic_years_failed", error);
    }
  });

  router.get("/:studentId", async (request, response) => {
    response.set("Cache-Control", "no-store");

    const studentId = studentIdSchema.safeParse(request.params.studentId);
    const query = studentDetailsQuerySchema.safeParse(request.query);

    if (!studentId.success || !query.success) {
      response.status(400).json({ error: "Invalid student request" });
      return;
    }

    try {
      const student = await queryStudent({
        organisationId,
        academicYearStart: query.data.academicYearStart,
        studentId: studentId.data,
      });

      if (!student) {
        response.status(404).json({ error: "Student not found" });
        return;
      }

      response.json(student);
    } catch (error) {
      respondUnavailable(response, "students.details_failed", error);
    }
  });

  router.get("/", async (request, response) => {
    response.set("Cache-Control", "no-store");

    const pagination = paginationSchema.safeParse(request.query);

    if (!pagination.success) {
      rejectPagination(response);
      return;
    }

    const { academicYearStart, sort, limit, cursor, q } = pagination.data;
    const search = q || undefined;
    const expectedSearchHash = searchHash(search);

    if (
      cursor &&
      (cursor.organisationId !== organisationId ||
        cursor.academicYearStart !== academicYearStart ||
        cursor.sort !== sort ||
        cursor.searchHash !== expectedSearchHash)
    ) {
      rejectPagination(response);
      return;
    }

    try {
      const page = await queryStudents({
        organisationId,
        academicYearStart,
        sort,
        limit,
        after: cursor && { surname: cursor.surname, id: cursor.id },
        ...(search && { search }),
      });

      const nextCursor = page.next
        ? cursorCodec.encode({
            organisationId,
            academicYearStart,
            sort,
            ...page.next,
            ...(expectedSearchHash && { searchHash: expectedSearchHash }),
          })
        : null;

      response.json({ items: page.items, nextCursor, limit });
    } catch (error) {
      respondUnavailable(response, "students.list_failed", error);
    }
  });

  return router;
}
