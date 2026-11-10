import express, { Router } from "express";
import type { NotificationController } from "./notification.controller.js";
import { rejectUnreadableBody } from "../../request-body.js";

export function createNotificationRouter(controller: NotificationController) {
  const router = Router();
  router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
  router.get("/", controller.list);
  router.put("/read", express.json({ limit: "2kb" }), controller.read);
  router.use(rejectUnreadableBody);
  return router;
}
