import type { RequestHandler } from "express";
import { z } from "zod";
import { describeDatabaseError } from "../../database-errors.js";
import type { Logger } from "../../logger.js";
import { studentDetailsQuerySchema } from "../students/student.pagination.js";
import type { AssessmentService } from "./assessment.service.js";

type AssessmentControllerDependencies = {
  service: AssessmentService;
  logger: Logger;
};

const studentIdSchema = z.uuid();

export function createAssessmentController({ service, logger }: AssessmentControllerDependencies) {
  const describeStudentAssessments: RequestHandler<{ studentId: string }> = async (
    request,
    response,
  ) => {
    const studentId = studentIdSchema.safeParse(request.params.studentId);
    const query = studentDetailsQuerySchema.safeParse(request.query);

    if (!studentId.success || !query.success) {
      response.status(400).json({ error: "Invalid assessment request" });
      return;
    }

    const { organisationId, yearGroups } = response.locals.actor;

    try {
      const assessments = await service.describeStudentAssessments(
        { organisationId, yearGroups },
        studentId.data,
        query.data.academicYearStart,
      );

      if (!assessments) {
        response.status(404).json({ error: "Student not found" });
        return;
      }

      response.json(assessments);
    } catch (error) {
      logger.error("assessments.student_failed", {
        requestId: response.locals.requestId,
        ...describeDatabaseError(error),
      });
      response.status(503).json({ error: "Assessments unavailable" });
    }
  };

  return { describeStudentAssessments };
}

export type AssessmentController = ReturnType<typeof createAssessmentController>;
