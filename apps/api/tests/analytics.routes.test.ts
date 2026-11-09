import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { createAnalyticsController } from "../src/features/analytics/analytics.controller.js";
import { createAnalyticsRouter } from "../src/features/analytics/analytics.routes.js";
import type { AnalyticsService } from "../src/features/analytics/analytics.service.js";
import { listen, recordingLogger, signedInAs } from "./support/http.js";

function analyticsApp(service: AnalyticsService) {
  const { logger } = recordingLogger();
  const app = express();
  app.use(signedInAs({
    organisationId: "11111111-1111-4111-8111-111111111111",
    role: "HEAD_OF_YEAR",
    yearGroups: [9],
  }));
  app.use("/analytics", createAnalyticsRouter(createAnalyticsController({ service, logger })));
  return app;
}

test("rejects malformed and out-of-scope ranking filters before querying", async (context) => {
  let calls = 0;
  const service = {
    overview: async () => ({}),
    listRankings: async () => {
      calls++;
      return {};
    },
  } as AnalyticsService;
  const url = await listen(context, analyticsApp(service));

  for (const [path, status] of [
    ["/analytics/rankings?academicYearStart=2026&measure=UNKNOWN", 400],
    ["/analytics/rankings?academicYearStart=2026&yearGroup=8", 403],
    ["/analytics/rankings?academicYearStart=2026&limit=51", 400],
    ["/analytics/overview?academicYearStart=2026&organisationId=other", 400],
  ] as const) {
    assert.equal((await fetch(`${url}${path}`)).status, status, path);
  }

  assert.equal(calls, 0);
});
