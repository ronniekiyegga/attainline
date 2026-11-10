import express, { Router, type RequestHandler } from "express";
import { rejectUnreadableBody } from "../../request-body.js";
import type { AuthController } from "./auth.controller.js";

type AuthRouterDependencies = {
  controller: AuthController;
  requireSession: RequestHandler;
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
