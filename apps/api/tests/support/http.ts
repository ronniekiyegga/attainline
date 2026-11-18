import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { TestContext } from "node:test";
import type { Express, RequestHandler } from "express";
import type { Actor } from "../../src/features/auth/auth.repository.js";
import type { Logger } from "../../src/logger.js";

export async function listen(context: TestContext, app: Express) {
  const server = app.listen(0, "127.0.0.1");

  context.after(
    () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    }),
  );

  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");

  return `http://127.0.0.1:${address.port}`;
}

type LogEntry = {
  level: "info" | "error";
  event: string;
  fields: Record<string, unknown>;
};

export function recordingLogger() {
  const entries: LogEntry[] = [];

  const logger: Logger = {
    info: (event, fields = {}) => entries.push({ level: "info", event, fields }),
    error: (event, fields = {}) => entries.push({ level: "error", event, fields }),
  };

  return { logger, entries };
}

export function signedInAs(
  access: Pick<Actor, "organisationId"> & Partial<Actor>,
): RequestHandler {
  const actor: Actor = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    membershipId: randomUUID(),
    role: "HEADTEACHER",
    yearGroups: null,
    ...access,
  };

  return (_request, response, next) => {
    response.locals.actor = actor;
    next();
  };
}
