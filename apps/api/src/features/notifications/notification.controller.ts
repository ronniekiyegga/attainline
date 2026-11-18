import type { RequestHandler, Response } from "express";
import { describeDatabaseError } from "../../database-errors.js";
import type { Logger } from "../../logger.js";
import type { NotificationService } from "./notification.service.js";
import { parseNotificationKey, parseNotificationYear } from "./notification.validation.js";

function actor(response: Response) {
  const { organisationId, membershipId, yearGroups } = response.locals.actor;
  return { organisationId, membershipId, yearGroups };
}

export function createNotificationController({ service, logger }: { service: NotificationService; logger: Logger }) {
  function unavailable(response: Response, event: string, error: unknown) {
    logger.error(event, { requestId: response.locals.requestId, ...describeDatabaseError(error) });
    response.status(503).json({ error: "Notifications unavailable" });
  }
  const list: RequestHandler = async (request, response) => {
    const query = parseNotificationYear(request.query);
    if (!query) { response.status(400).json({ error: "Invalid notification request" }); return; }
    try { response.json({ items: await service.list(actor(response), query.academicYearStart) }); }
    catch (error) { unavailable(response, "notifications.list_failed", error); }
  };
  const read: RequestHandler = async (request, response) => {
    const body = parseNotificationKey(request.body);
    if (!body) { response.status(400).json({ error: "Invalid notification request" }); return; }
    try { await service.read(actor(response), body.notificationKey); response.status(204).end(); }
    catch (error) { unavailable(response, "notifications.read_failed", error); }
  };
  return { list, read };
}

export type NotificationController = ReturnType<typeof createNotificationController>;
