import { Router } from "express";
import type { AnalyticsController } from "./analytics.controller.js";

export function createAnalyticsRouter(controller: AnalyticsController) {
  const router = Router();

  router.use((_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });

  router.get("/overview", controller.overview);
  router.get("/rankings", controller.listRankings);

  return router;
}
