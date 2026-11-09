import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { z } from "zod";

declare global {
  namespace Express {
    interface Locals {
      requestId: string;
    }
  }
}

const requestIdSchema = z.uuid();

export const requestId: RequestHandler = (request, response, next) => {
  const incoming = requestIdSchema.safeParse(request.get("x-request-id"));
  const id = incoming.success ? incoming.data : randomUUID();

  response.locals.requestId = id;
  response.set("X-Request-Id", id);
  next();
};
