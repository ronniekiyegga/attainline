import type { RequestHandler } from "express";
import { describeDatabaseError } from "../../database-errors.js";
import type { Logger } from "../../logger.js";
import type { Actor } from "./auth.repository.js";
import { bearerToken } from "./session-token.js";

declare global {
  namespace Express {
    interface Locals {
      actor: Actor;
    }
  }
}

type SessionGuardDependencies = {
  authenticate: (token: string) => Promise<Actor | null>;
  logger: Logger;
};

export function createSessionGuard({
  authenticate,
  logger,
}: SessionGuardDependencies): RequestHandler {
  return async (request, response, next) => {
    response.set("Cache-Control", "no-store");

    const token = bearerToken(request.get("authorization"));

    if (!token) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }

    let actor: Actor | null;

    try {
      actor = await authenticate(token);
    } catch (error) {
      logger.error("auth.session_lookup_failed", {
        requestId: response.locals.requestId,
        ...describeDatabaseError(error),
      });
      response.status(503).json({ error: "Authentication unavailable" });
      return;
    }

    if (!actor) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }

    response.locals.actor = actor;
    next();
  };
}
