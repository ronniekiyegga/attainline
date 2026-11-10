import type { RequestHandler, Response } from "express";
import { z } from "zod";
import { describeDatabaseError } from "../../database-errors.js";
import type { Logger } from "../../logger.js";
import type { NotificationService } from "./notification.service.js";

const yearSchema = z.object({ academicYearStart: z.coerce.number().int().min(2000).max(2200) }).strict();
const keySchema = z.object({ notificationKey: z.string().min(1).max(160) }).strict();

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
    const query = yearSchema.safeParse(request.query);
    if (!query.success) { response.status(400).json({ error: "Invalid notification request" }); return; }
    try { response.json({ items: await service.list(actor(response), query.data.academicYearStart) }); }
    catch (error) { unavailable(response, "notifications.list_failed", error); }
  };
  const read: RequestHandler = async (request, response) => {
    const body = keySchema.safeParse(request.body);
    if (!body.success) { response.status(400).json({ error: "Invalid notification request" }); return; }
    try { await service.read(actor(response), body.data.notificationKey); response.status(204).end(); }
    catch (error) { unavailable(response, "notifications.read_failed", error); }
  };
  return { list, read };
}

export type NotificationController = ReturnType<typeof createNotificationController>;
