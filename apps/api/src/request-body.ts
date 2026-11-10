import type { ErrorRequestHandler } from "express";
import { z } from "zod";

const clientErrorSchema = z.object({ status: z.number().int().min(400).max(499) });

export const rejectUnreadableBody: ErrorRequestHandler = (error, _request, response, next) => {
  const clientError = clientErrorSchema.safeParse(error);
  if (!clientError.success) {
    next(error);
    return;
  }
  response.status(clientError.data.status).json({ error: "Invalid request body" });
};
