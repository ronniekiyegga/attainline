import express, { Router } from "express";
import type { CalendarController } from "./calendar.controller.js";
import { rejectUnreadableBody } from "../../request-body.js";

export function createCalendarRouter(controller: CalendarController) {
  const router = Router();
  router.use((_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });
  router.get("/", controller.list);
  router.post("/", express.json({ limit: "8kb" }), controller.create);
  router.delete("/:eventId", controller.remove);
  router.use(rejectUnreadableBody);
  return router;
}
