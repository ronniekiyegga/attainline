import type { RequestHandler, Response } from "express";
import { describeDatabaseError } from "../../database-errors.js";
import type { Logger } from "../../logger.js";
import type { CalendarAccess } from "./calendar.repository.js";
import type { CalendarService } from "./calendar.service.js";
import {
  parseCalendarEvent,
  parseCalendarEventId,
  parseCalendarRange,
} from "./calendar.validation.js";

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
    const range = parseCalendarRange(request.query);
    if (!range) {
      response.status(400).json({ error: "Invalid calendar range" });
      return;
    }
    try {
      response.json({
        items: (await service.list(access(response), range.from, range.to)).map(serializeEvent),
      });
    } catch (error) {
      unavailable(response, "calendar.list_failed", error);
    }
  };

  const create: RequestHandler = async (request, response) => {
    const event = parseCalendarEvent(request.body);
    if (!event) {
      response.status(400).json({ error: "Invalid calendar event" });
      return;
    }
    try {
      const result = await service.create(access(response), event);
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
    const eventId = parseCalendarEventId(request.params.eventId);
    if (!eventId) {
      response.status(400).json({ error: "Invalid calendar event" });
      return;
    }
    try {
      const result = await service.remove(access(response), eventId);
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
