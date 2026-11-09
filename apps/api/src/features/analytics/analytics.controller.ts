import type { RequestHandler, Response } from "express";
import { z } from "zod";
import { describeDatabaseError } from "../../database-errors.js";
import type { Logger } from "../../logger.js";
import { RANKING_MEASURES } from "../assessments/assessment.indicators.js";
import type { StudentAccess } from "../students/student.repository.js";
import type { AnalyticsService } from "./analytics.service.js";

const academicYearStartSchema = z.coerce.number().int().min(2000).max(2200);
const overviewQuerySchema = z.object({ academicYearStart: academicYearStartSchema }).strict();
const rankingsQuerySchema = z.object({
  academicYearStart: academicYearStartSchema,
  measure: z.enum(RANKING_MEASURES).default("CAT4_MEAN"),
  yearGroup: z.coerce.number().int().min(1).max(14).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).strict();

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
    const query = overviewQuerySchema.safeParse(request.query);
    if (!query.success) {
      response.status(400).json({ error: "Invalid analytics request" });
      return;
    }

    try {
      response.json(await service.overview(access(response), query.data.academicYearStart));
    } catch (error) {
      unavailable(response, "analytics.overview_failed", error);
    }
  };

  const listRankings: RequestHandler = async (request, response) => {
    const query = rankingsQuerySchema.safeParse(request.query);
    if (!query.success) {
      response.status(400).json({ error: "Invalid rankings request" });
      return;
    }

    const actorAccess = access(response);
    if (
      query.data.yearGroup !== undefined
      && actorAccess.yearGroups !== null
      && !actorAccess.yearGroups.includes(query.data.yearGroup)
    ) {
      response.status(403).json({ error: "Year group unavailable" });
      return;
    }

    try {
      response.json(await service.listRankings(actorAccess, query.data));
    } catch (error) {
      unavailable(response, "analytics.rankings_failed", error);
    }
  };

  return { overview, listRankings };
}

export type AnalyticsController = ReturnType<typeof createAnalyticsController>;
