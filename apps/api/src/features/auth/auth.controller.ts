import type { RequestHandler, Response } from "express";
import { z } from "zod";
import { describeDatabaseError } from "../../database-errors.js";
import type { Logger } from "../../logger.js";
import type { AuthService, IssuedSession } from "./auth.service.js";

const signInSchema = z.strictObject({
  email: z.string().trim().toLowerCase().min(3).max(254),
  password: z.string().min(1).max(1024),
});

const organisationSwitchSchema = z.strictObject({
  organisationId: z.uuid(),
});

type AuthControllerDependencies = {
  service: AuthService;
  logger: Logger;
};

function sendSession(response: Response, status: number, session: IssuedSession) {
  response.status(status).json({
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
  });
}

export function createAuthController({ service, logger }: AuthControllerDependencies) {
  function respondUnavailable(response: Response, event: string, error: unknown) {
    logger.error(event, {
      requestId: response.locals.requestId,
      ...describeDatabaseError(error),
    });
    response.status(503).json({ error: "Authentication unavailable" });
  }

  const signIn: RequestHandler = async (request, response) => {
    const credentials = signInSchema.safeParse(request.body);

    if (!credentials.success) {
      response.status(400).json({ error: "Invalid sign-in request" });
      return;
    }

    try {
      const result = await service.signIn(credentials.data.email, credentials.data.password);

      switch (result.status) {
        case "signed-in":
          sendSession(response, 201, result.session);
          return;
        case "locked":
          response.set("Retry-After", String(result.retryAfterSeconds));
          response.status(429).json({ error: "Too many failed sign-in attempts" });
          return;
        case "invalid-credentials":
          logger.info("auth.sign_in_rejected", { requestId: response.locals.requestId });
          response.status(401).json({ error: "Invalid email or password" });
          return;
        case "no-membership":
          response.status(403).json({ error: "No active school membership" });
          return;
      }
    } catch (error) {
      respondUnavailable(response, "auth.sign_in_failed", error);
    }
  };

  const describeSession: RequestHandler = async (_request, response) => {
    try {
      response.json(await service.describeSession(response.locals.actor));
    } catch (error) {
      respondUnavailable(response, "auth.session_failed", error);
    }
  };

  const switchOrganisation: RequestHandler = async (request, response) => {
    const target = organisationSwitchSchema.safeParse(request.body);

    if (!target.success) {
      response.status(400).json({ error: "Invalid organisation" });
      return;
    }

    try {
      const result = await service.switchOrganisation(
        response.locals.actor,
        target.data.organisationId,
      );

      switch (result.status) {
        case "switched":
          sendSession(response, 200, result.session);
          return;
        case "not-a-member":
          response.status(403).json({ error: "Not a member of this organisation" });
          return;
        case "session-ended":
          response.status(401).json({ error: "Authentication required" });
          return;
      }
    } catch (error) {
      respondUnavailable(response, "auth.organisation_switch_failed", error);
    }
  };

  const signOut: RequestHandler = async (_request, response) => {
    try {
      await service.signOut(response.locals.actor);
      response.status(204).end();
    } catch (error) {
      respondUnavailable(response, "auth.sign_out_failed", error);
    }
  };

  return { signIn, describeSession, switchOrganisation, signOut };
}

export type AuthController = ReturnType<typeof createAuthController>;
