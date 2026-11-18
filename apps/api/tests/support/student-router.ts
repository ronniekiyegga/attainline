import type { Logger } from "../../src/logger.js";
import type { StudentCursorCodec } from "../../src/features/students/student.cursor.js";
import { createStudentController } from "../../src/features/students/student.controller.js";
import { createStudentRouter } from "../../src/features/students/student.routes.js";
import { createStudentService } from "../../src/features/students/student.service.js";

export type StudentRouterDependencies = Omit<
  Parameters<typeof createStudentController>[0],
  "directory"
> & {
  queryStudents: Parameters<typeof createStudentService>[0]["queryStudents"];
  cursorCodec: StudentCursorCodec;
  logger: Logger;
};

export function studentRouter({ queryStudents, ...dependencies }: StudentRouterDependencies) {
  return createStudentRouter(
    createStudentController({
      ...dependencies,
      directory: createStudentService({ queryStudents, cursorCodec: dependencies.cursorCodec }),
    }),
  );
}
