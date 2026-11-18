import { Router } from "express";
import type { AssessmentController } from "./assessment.controller.js";

export function createAssessmentRouter(controller: AssessmentController) {
  const router = Router({ mergeParams: true });

  router.use((_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });

  router.get("/", controller.describeStudentAssessments);

  return router;
}
