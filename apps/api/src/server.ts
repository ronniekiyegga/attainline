import { z } from "zod";
import { createApp } from "./app.js";
import { describeDatabaseError } from "./database-errors.js";
import { checkDatabase, database } from "./database.js";
import { createAuthController } from "./features/auth/auth.controller.js";
import * as authRepository from "./features/auth/auth.repository.js";
import { createAuthRouter } from "./features/auth/auth.routes.js";
import { createAuthService } from "./features/auth/auth.service.js";
import { createSessionGuard } from "./features/auth/require-session.js";
import {
  createStudentCursorCodec,
  parseStudentCursorKey,
} from "./features/students/student.cursor.js";
import {
  findStudent,
  listAcademicYearStarts,
  listStudents,
} from "./features/students/student.repository.js";
import { createStudentController } from "./features/students/student.controller.js";
import { createStudentRouter } from "./features/students/student.routes.js";
import { createStudentService } from "./features/students/student.service.js";
import { logger } from "./logger.js";

const cursorCodec = createStudentCursorCodec(
  parseStudentCursorKey(process.env.STUDENT_CURSOR_KEY),
);

const port = z.coerce.number().int().min(1).max(65535)
  .parse(process.env.PORT ?? "4100");

const authService = createAuthService({
  repository: authRepository,
  now: () => new Date(),
});

const requireSession = createSessionGuard({
  authenticate: authService.authenticate,
  logger,
});

const studentService = createStudentService({
  queryStudents: listStudents,
  queryStudent: findStudent,
  queryAcademicYearStarts: listAcademicYearStarts,
  cursorCodec,
});

const app = createApp({
  checkDatabase,
  logger,
  requireSession,
  authRouter: createAuthRouter({
    controller: createAuthController({ service: authService, logger }),
    requireSession,
  }),
  studentRouter: createStudentRouter(
    createStudentController({ service: studentService, cursorCodec, logger }),
  ),
});

const server = app.listen(port, () => {
  logger.info("server.listening", { port });
});

function shutdown() {
  server.close(() => {
    database.$disconnect().catch((error: unknown) => {
      logger.error("server.shutdown_failed", describeDatabaseError(error));
      process.exitCode = 1;
    });
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
