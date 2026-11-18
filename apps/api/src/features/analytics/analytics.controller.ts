import type { RequestHandler, Response } from "express";
import { describeDatabaseError } from "../../database-errors.js";
import type { Logger } from "../../logger.js";
import type { StudentAccess } from "../students/student.repository.js";
import type { AnalyticsService } from "./analytics.service.js";
import { parseOverviewQuery, parseRankingsQuery } from "./analytics.validation.js";

type AnalyticsControllerDependencies = {
  service: AnalyticsService;
  logger: Logger;
};

function access(response: Response): StudentAccess {
  const { organisationId, yearGroups } = response.locals.actor;
  return { organisationId, yearGroups };
}

export function createAnalyticsController({ service, logger }: AnalyticsControllerDependencies) {
  function unavailable(response: Response, event: string, error: unknown) {
    logger.error(event, {
      requestId: response.locals.requestId,
      ...describeDatabaseError(error),
    });
    response.status(503).json({ error: "Analytics unavailable" });
  }

  const overview: RequestHandler = async (request, response) => {
    const query = parseOverviewQuery(request.query);
    if (!query) {
      response.status(400).json({ error: "Invalid analytics request" });
      return;
    }

    try {
      response.json(await service.overview(access(response), query.academicYearStart));
    } catch (error) {
      unavailable(response, "analytics.overview_failed", error);
    }
  };

  const listRankings: RequestHandler = async (request, response) => {
    const query = parseRankingsQuery(request.query);
    if (!query) {
      response.status(400).json({ error: "Invalid rankings request" });
      return;
    }

    const actorAccess = access(response);
    if (
      query.yearGroup !== undefined
      && actorAccess.yearGroups !== null
      && !actorAccess.yearGroups.includes(query.yearGroup)
    ) {
      response.status(403).json({ error: "Year group unavailable" });
      return;
    }

    try {
      response.json(await service.listRankings(actorAccess, query));
    } catch (error) {
      unavailable(response, "analytics.rankings_failed", error);
    }
  };

  return { overview, listRankings };
}

export type AnalyticsController = ReturnType<typeof createAnalyticsController>;
