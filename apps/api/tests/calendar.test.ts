import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, type TestContext } from "node:test";
import express from "express";
import { createCalendarController } from "../src/features/calendar/calendar.controller.js";
import { createCalendarRouter } from "../src/features/calendar/calendar.routes.js";
import { createCalendarService } from "../src/features/calendar/calendar.service.js";
import { listen, recordingLogger, signedInAs } from "./support/http.js";

const organisationId = randomUUID();
const membershipId = randomUUID();
const eventId = randomUUID();
const startsAt = new Date("2026-10-12T14:30:00.000Z");
const endsAt = new Date("2026-10-12T15:15:00.000Z");

function event(createdByMembershipId = membershipId) {
  return {
    id: eventId,
    title: "Synthetic assessment review",
    description: "Invented calendar fixture",
    startsAt,
    endsAt,
    yearGroup: 9,
    createdByMembershipId,
  };
}

async function startCalendar(context: TestContext, options: {
  yearGroups?: number[] | null;
  role?: "HEADTEACHER" | "HEAD_OF_YEAR" | "TEACHER";
  listEvents?: ReturnType<typeof createCalendarService>["list"];
  createEvent?: Parameters<typeof createCalendarService>[0]["createEvent"];
  findEvent?: Parameters<typeof createCalendarService>[0]["findEvent"];
  deleteEvent?: Parameters<typeof createCalendarService>[0]["deleteEvent"];
} = {}) {
  const service = createCalendarService({
    listEvents: options.listEvents ?? (async () => []),
    createEvent: options.createEvent ?? (async (_access, input) => ({ ...event(), ...input })),
    findEvent: options.findEvent ?? (async () => ({ id: eventId, createdByMembershipId: membershipId })),
    deleteEvent: options.deleteEvent ?? (async () => ({ count: 1 })),
  });
  const app = express();
  app.use(signedInAs({
    organisationId,
    membershipId,
    role: options.role ?? "TEACHER",
    yearGroups: options.yearGroups === undefined ? [9] : options.yearGroups,
  }));
  app.use("/calendar", createCalendarRouter(createCalendarController({ service, logger: recordingLogger().logger })));
  return `${await listen(context, app)}/calendar`;
}

test("lists only through the actor-scoped repository boundary", async (context) => {
  let received: unknown;
  const url = await startCalendar(context, {
    listEvents: async (access, from, to) => {
      received = { access, from, to };
      return [event()];
    },
  });
  const response = await fetch(`${url}?from=2026-10-01T00:00:00.000Z&to=2026-11-01T00:00:00.000Z`);
  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    access: { membershipId, organisationId, role: "TEACHER", yearGroups: [9] },
    from: new Date("2026-10-01T00:00:00.000Z"),
    to: new Date("2026-11-01T00:00:00.000Z"),
  });
  assert.deepEqual(await response.json(), { items: [{ ...event(), startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }] });
});

test("rejects an event outside an assigned year group", async (context) => {
  let writes = 0;
  const url = await startCalendar(context, { createEvent: async () => { writes++; return event(); } });
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Synthetic review", startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), yearGroup: 10 }),
  });
  assert.equal(response.status, 403);
  assert.equal(writes, 0);
});

test("allows a headteacher to create a whole-school event", async (context) => {
  let created: unknown;
  const url = await startCalendar(context, {
    role: "HEADTEACHER",
    yearGroups: null,
    createEvent: async (access, input) => {
      created = { access, input };
      return { ...event(), ...input, yearGroup: null };
    },
  });
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Whole-school synthetic review", startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(created, {
    access: { membershipId, organisationId, role: "HEADTEACHER", yearGroups: null },
    input: { title: "Whole-school synthetic review", startsAt, endsAt },
  });
});

test("prevents a scoped member from deleting another member's event", async (context) => {
  let deletes = 0;
  const url = await startCalendar(context, {
    findEvent: async () => ({ id: eventId, createdByMembershipId: randomUUID() }),
    deleteEvent: async () => { deletes++; return { count: 1 }; },
  });
  const response = await fetch(`${url}/${eventId}`, { method: "DELETE" });
  assert.equal(response.status, 403);
  assert.equal(deletes, 0);
});

test("returns a bounded client error for malformed JSON", async (context) => {
  const url = await startCalendar(context);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid request body" });
});
