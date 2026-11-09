import express, { Router, type ErrorRequestHandler, type RequestHandler } from "express";
import { z } from "zod";
import type { AuthController } from "./auth.controller.js";

type AuthRouterDependencies = {
  controller: AuthController;
  requireSession: RequestHandler;
};

const clientErrorSchema = z.object({ status: z.number().int().min(400).max(499) });

const rejectUnreadableBody: ErrorRequestHandler = (error, _request, response, next) => {
  const clientError = clientErrorSchema.safeParse(error);

  if (!clientError.success) {
    next(error);
    return;
  }

  response.status(clientError.data.status).json({ error: "Invalid request body" });
};

export function createAuthRouter({ controller, requireSession }: AuthRouterDependencies) {
  const router = Router();

  router.use((_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });
  router.use(express.json({ limit: "4kb" }));

  router.post("/sessions", controller.signIn);
  router.get("/session", requireSession, controller.describeSession);
  router.put("/session/organisation", requireSession, controller.switchOrganisation);
  router.delete("/session", requireSession, controller.signOut);

  router.use(rejectUnreadableBody);

  return router;
}
