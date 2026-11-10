import { database } from "../../database.js";
import type { Actor } from "../auth/auth.repository.js";

export type CalendarAccess = Pick<Actor, "membershipId" | "organisationId" | "role" | "yearGroups">;

export type NewCalendarEvent = {
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  yearGroup?: number;
};

function visibleYearGroups(access: CalendarAccess) {
  return access.yearGroups === null ? {} : { yearGroup: { in: access.yearGroups } };
}

export async function listCalendarEvents(access: CalendarAccess, from: Date, to: Date) {
  return database.calendarEvent.findMany({
    where: {
      organisationId: access.organisationId,
      startsAt: { lt: to },
      endsAt: { gt: from },
      ...visibleYearGroups(access),
    },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      yearGroup: true,
      createdByMembershipId: true,
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    take: 200,
  });
}

export async function createCalendarEvent(access: CalendarAccess, event: NewCalendarEvent) {
  return database.calendarEvent.create({
    data: {
      organisationId: access.organisationId,
      createdByMembershipId: access.membershipId,
      ...event,
    },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      yearGroup: true,
      createdByMembershipId: true,
    },
  });
}

export async function findCalendarEvent(access: CalendarAccess, eventId: string) {
  return database.calendarEvent.findFirst({
    where: {
      id: eventId,
      organisationId: access.organisationId,
      ...visibleYearGroups(access),
    },
    select: { id: true, createdByMembershipId: true },
  });
}

export async function deleteCalendarEvent(organisationId: string, eventId: string) {
  return database.calendarEvent.deleteMany({ where: { id: eventId, organisationId } });
}
