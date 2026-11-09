import type { Logger } from "../../src/logger.js";
import type { StudentCursorCodec } from "../../src/features/students/student.cursor.js";
import { createStudentController } from "../../src/features/students/student.controller.js";
import { createStudentRouter } from "../../src/features/students/student.routes.js";
import { createStudentService } from "../../src/features/students/student.service.js";

export type StudentRouterDependencies = Parameters<typeof createStudentService>[0] & {
  cursorCodec: StudentCursorCodec;
  logger: Logger;
};

export function studentRouter({ logger, ...dependencies }: StudentRouterDependencies) {
  return createStudentRouter(
    createStudentController({
      service: createStudentService(dependencies),
      cursorCodec: dependencies.cursorCodec,
      logger,
    }),
  );
}
