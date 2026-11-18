import { Router } from "express";
import type { StudentController } from "./student.controller.js";

export function createStudentRouter(controller: StudentController) {
  const router = Router();

  router.use((_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });

  router.get("/academic-years", controller.listAcademicYears);
  router.get("/:studentId", controller.findStudent);
  router.get("/", controller.listDirectory);

  return router;
}
