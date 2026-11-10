import assert from "node:assert/strict";
import { test } from "node:test";
import { createNotificationService } from "../src/features/notifications/notification.service.js";

const actor = {
  organisationId: "11111111-1111-4111-8111-111111111111",
  membershipId: "22222222-2222-4222-8222-222222222222",
  yearGroups: [9],
};

const overview = {
  academicYearStart: 2026,
  cohortSize: 12,
  assessedStudents: 9,
  coveragePercentage: 75,
  onTrackPercentage: 50,
  averageStandardAgeScore: 100,
  statusCounts: { ON_TRACK: 6, AT_RISK: 2, PENDING: 1, OFF_TRACK: 3 },
  priorityCounts: { LOW: 6, MEDIUM: 4, HIGH: 2 },
  yearGroups: [{ yearGroup: 9, students: 12 }],
  measures: [],
  topRankings: [],
};

test("derives notifications from the authoritative overview and membership reads", async () => {
  const service = createNotificationService({
    overview: async (access, year) => {
      assert.deepEqual(access, actor);
      assert.equal(year, 2026);
      return overview;
    },
    listReads: async (organisationId, membershipId) => {
      assert.equal(organisationId, actor.organisationId);
      assert.equal(membershipId, actor.membershipId);
      return new Set(["assessment:2026:coverage:75"]);
    },
    markRead: async () => ({ notificationKey: "unused", readAt: new Date() }),
  });

  const items = await service.list(actor, 2026);
  assert.deepEqual(items.map(({ key, read }) => ({ key, read })), [
    { key: "assessment:2026:priority:2", read: false },
    { key: "assessment:2026:coverage:75", read: true },
    { key: "assessment:2026:off-track:3", read: false },
  ]);
  assert.equal(items[0]?.title, "2 high-priority indicators flagged");
  assert.ok(items.every((item) => !Object.hasOwn(item, "date")));
});

test("writes a read receipt only within the active membership and organisation", async () => {
  let received: unknown;
  const service = createNotificationService({
    overview: async () => overview,
    listReads: async () => new Set(),
    markRead: async (organisationId, membershipId, notificationKey) => {
      received = { organisationId, membershipId, notificationKey };
      return { notificationKey, readAt: new Date() };
    },
  });

  await service.read(actor, "assessment:2026:priority:2");
  assert.deepEqual(received, {
    organisationId: actor.organisationId,
    membershipId: actor.membershipId,
    notificationKey: "assessment:2026:priority:2",
  });
});
