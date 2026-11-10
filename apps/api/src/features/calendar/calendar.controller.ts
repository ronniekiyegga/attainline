import type { RequestHandler, Response } from "express";
import { z } from "zod";
import { describeDatabaseError } from "../../database-errors.js";
import type { Logger } from "../../logger.js";
import type { CalendarAccess } from "./calendar.repository.js";
import type { CalendarService } from "./calendar.service.js";

const dateTimeSchema = z.iso.datetime({ offset: true });
const rangeSchema = z.object({ from: dateTimeSchema, to: dateTimeSchema }).strict();
const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema,
  yearGroup: z.number().int().min(1).max(14).optional(),
}).strict();
const eventIdSchema = z.uuid();

function access(response: Response): CalendarAccess {
  const { membershipId, organisationId, role, yearGroups } = response.locals.actor;
  return { membershipId, organisationId, role, yearGroups };
}

function serializeEvent<T extends { startsAt: Date; endsAt: Date }>(event: T) {
  return { ...event, startsAt: event.startsAt.toISOString(), endsAt: event.endsAt.toISOString() };
}

export function createCalendarController({ service, logger }: { service: CalendarService; logger: Logger }) {
  function unavailable(response: Response, event: string, error: unknown) {
    logger.error(event, { requestId: response.locals.requestId, ...describeDatabaseError(error) });
    response.status(503).json({ error: "Calendar unavailable" });
  }

  const list: RequestHandler = async (request, response) => {
    const range = rangeSchema.safeParse(request.query);
    if (!range.success) {
      response.status(400).json({ error: "Invalid calendar range" });
      return;
    }
    const from = new Date(range.data.from);
    const to = new Date(range.data.to);
    if (to <= from || to.getTime() - from.getTime() > 93 * 24 * 60 * 60 * 1000) {
      response.status(400).json({ error: "Invalid calendar range" });
      return;
    }
    try {
      response.json({ items: (await service.list(access(response), from, to)).map(serializeEvent) });
    } catch (error) {
      unavailable(response, "calendar.list_failed", error);
    }
  };

  const create: RequestHandler = async (request, response) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid calendar event" });
      return;
    }
    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (endsAt <= startsAt || endsAt.getTime() - startsAt.getTime() > 24 * 60 * 60 * 1000) {
      response.status(400).json({ error: "Invalid calendar event" });
      return;
    }
    try {
      const result = await service.create(access(response), { ...parsed.data, startsAt, endsAt });
      if (result.status === "forbidden") {
        response.status(403).json({ error: "Year group unavailable" });
        return;
      }
      response.status(201).json(serializeEvent(result.event));
    } catch (error) {
      unavailable(response, "calendar.create_failed", error);
    }
  };

  const remove: RequestHandler = async (request, response) => {
    const eventId = eventIdSchema.safeParse(request.params.eventId);
    if (!eventId.success) {
      response.status(400).json({ error: "Invalid calendar event" });
      return;
    }
    try {
      const result = await service.remove(access(response), eventId.data);
      if (result.status === "not-found") {
        response.status(404).json({ error: "Calendar event not found" });
        return;
      }
      if (result.status === "forbidden") {
        response.status(403).json({ error: "Calendar event unavailable" });
        return;
      }
      response.status(204).end();
    } catch (error) {
      unavailable(response, "calendar.delete_failed", error);
    }
  };

  return { list, create, remove };
}

export type CalendarController = ReturnType<typeof createCalendarController>;
