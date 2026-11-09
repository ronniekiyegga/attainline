import type { RequestHandler } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const rejectBrowserMutations: RequestHandler = (request, response, next) => {
  if (
    !SAFE_METHODS.has(request.method) &&
    (request.get("origin") !== undefined || request.get("sec-fetch-site") !== undefined)
  ) {
    response.status(403).json({ error: "Browser requests cannot change state" });
    return;
  }

  next();
};
