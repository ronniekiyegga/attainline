import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { requireLocalTestDatabase } from "./support/test-database.js";

requireLocalTestDatabase();

const { database } = await import("../src/database.js");
const { listCalendarEvents, createCalendarEvent } = await import("../src/features/calendar/calendar.repository.js");
const { listReadKeys, markNotificationRead } = await import("../src/features/notifications/notification.repository.js");

after(() => database.$disconnect());

test("calendar events and notification reads remain inside organisation and year-group scopes", async () => {
  const organisationA = randomUUID();
  const organisationB = randomUUID();
  const userId = randomUUID();
  const membershipA = randomUUID();
  const membershipB = randomUUID();
  const run = randomUUID().slice(0, 8);
  const from = new Date("2026-10-01T00:00:00.000Z");
  const to = new Date("2026-11-01T00:00:00.000Z");

  try {
    await database.organisation.createMany({ data: [{ id: organisationA, name: `Synthetic Calendar A ${run}` }, { id: organisationB, name: `Synthetic Calendar B ${run}` }] });
    await database.user.create({ data: { id: userId, email: `calendar.${run}@example.test`, displayName: "Synthetic Calendar User", passwordHash: "not-used-in-this-test" } });
    await database.organisationMembership.createMany({ data: [
      { id: membershipA, organisationId: organisationA, userId, role: "TEACHER" },
      { id: membershipB, organisationId: organisationB, userId, role: "HEADTEACHER" },
    ] });

    const accessA = { organisationId: organisationA, membershipId: membershipA, role: "TEACHER" as const, yearGroups: [9] };
    const accessB = { organisationId: organisationB, membershipId: membershipB, role: "HEADTEACHER" as const, yearGroups: null };
    await createCalendarEvent(accessA, { title: "Synthetic Year 9 review", startsAt: new Date("2026-10-10T10:00:00.000Z"), endsAt: new Date("2026-10-10T11:00:00.000Z"), yearGroup: 9 });
    await createCalendarEvent(accessA, { title: "Synthetic Year 10 review", startsAt: new Date("2026-10-11T10:00:00.000Z"), endsAt: new Date("2026-10-11T11:00:00.000Z"), yearGroup: 10 });
    await createCalendarEvent(accessB, { title: "Synthetic foreign review", startsAt: new Date("2026-10-12T10:00:00.000Z"), endsAt: new Date("2026-10-12T11:00:00.000Z") });

    const events = await listCalendarEvents(accessA, from, to);
    assert.deepEqual(events.map(({ title }) => title), ["Synthetic Year 9 review"]);

    await markNotificationRead(organisationA, membershipA, "assessment:2026:coverage:75");
    assert.deepEqual([...await listReadKeys(organisationA, membershipA)], ["assessment:2026:coverage:75"]);
    assert.deepEqual([...await listReadKeys(organisationB, membershipB)], []);
  } finally {
    await database.notificationRead.deleteMany({ where: { organisationId: { in: [organisationA, organisationB] } } });
    await database.calendarEvent.deleteMany({ where: { organisationId: { in: [organisationA, organisationB] } } });
    await database.organisationMembership.deleteMany({ where: { organisationId: { in: [organisationA, organisationB] } } });
    await database.user.deleteMany({ where: { id: userId } });
    await database.organisation.deleteMany({ where: { id: { in: [organisationA, organisationB] } } });
  }
});
