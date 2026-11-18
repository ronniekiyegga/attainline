import { database } from "../../database.js";

export async function listReadKeys(organisationId: string, membershipId: string) {
  const reads = await database.notificationRead.findMany({
    where: { organisationId, membershipId },
    select: { notificationKey: true },
  });
  return new Set(reads.map(({ notificationKey }) => notificationKey));
}

export async function markNotificationRead(organisationId: string, membershipId: string, notificationKey: string) {
  return database.notificationRead.upsert({
    where: { membershipId_notificationKey: { membershipId, notificationKey } },
    create: { organisationId, membershipId, notificationKey },
    update: { readAt: new Date() },
    select: { notificationKey: true, readAt: true },
  });
}
