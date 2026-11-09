import express, {
  type ErrorRequestHandler,
  type RequestHandler,
  type Router,
} from "express";
import { rejectBrowserMutations } from "./browser-mutations.js";
import { describeDatabaseError } from "./database-errors.js";
import type { Logger } from "./logger.js";
import { requestId } from "./request-id.js";

type AppDependencies = {
  checkDatabase: () => Promise<void>;
  authRouter: Router;
  studentRouter: Router;
  assessmentRouter: Router;
  requireSession: RequestHandler;
  logger: Logger;
};

export function createApp({
  checkDatabase,
  authRouter,
  studentRouter,
  assessmentRouter,
  requireSession,
  logger,
}: AppDependencies) {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(rejectBrowserMutations);

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/ready", async (_request, response) => {
    response.set("Cache-Control", "no-store");

    try {
      await checkDatabase();
      response.json({ status: "ready" });
    } catch (error) {
      logger.error("readiness.check_failed", {
        requestId: response.locals.requestId,
        ...describeDatabaseError(error),
      });
      response.status(503).json({ status: "unavailable" });
    }
  });

  app.use("/auth", authRouter);
  app.use("/students/:studentId/assessments", requireSession, assessmentRouter);
  app.use("/students", requireSession, studentRouter);

  app.use((_request, response) => {
    response.status(404).json({ error: "Not found" });
  });

  const handleUnexpectedError: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next,
  ) => {
    logger.error("http.unhandled_error", {
      requestId: response.locals.requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    response.status(500).json({ error: "Internal server error" });
  };

  app.use(handleUnexpectedError);

  return app;
}
