import { expect, test } from "@playwright/test";
import { useScenario } from "./support/student-api";

test("reports full-stack readiness without exposing dependency details", async ({ request }) => {
  await useScenario(request, "populated");

  const ready = await request.get("/health");
  expect(ready.status()).toBe(200);
  expect(ready.headers()["cache-control"]).toBe("no-store");
  expect(await ready.json()).toEqual({ status: "ready" });

  await useScenario(request, "unavailable");

  const unavailable = await request.get("/health");
  expect(unavailable.status()).toBe(503);
  expect(unavailable.headers()["cache-control"]).toBe("no-store");
  expect(await unavailable.json()).toEqual({ status: "unavailable" });

  await useScenario(request, "readiness-slow");
  const startedAt = Date.now();

  const timedOut = await request.get("/health");
  expect(timedOut.status()).toBe(503);
  expect(Date.now() - startedAt).toBeLessThan(5_000);
  expect(timedOut.headers()["cache-control"]).toBe("no-store");
  expect(await timedOut.json()).toEqual({ status: "unavailable" });
});
