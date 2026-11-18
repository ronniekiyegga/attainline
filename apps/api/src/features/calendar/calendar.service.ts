import type { Actor } from "../auth/auth.repository.js";
import type {
  CalendarAccess,
  NewCalendarEvent,
  createCalendarEvent,
  deleteCalendarEvent,
  findCalendarEvent,
  listCalendarEvents,
} from "./calendar.repository.js";

type CalendarServiceDependencies = {
  listEvents: typeof listCalendarEvents;
  createEvent: typeof createCalendarEvent;
  findEvent: typeof findCalendarEvent;
  deleteEvent: typeof deleteCalendarEvent;
};

export function createCalendarService(dependencies: CalendarServiceDependencies) {
  function canUseYearGroup(access: CalendarAccess, yearGroup: number | undefined) {
    if (access.yearGroups === null) return true;
    return yearGroup !== undefined && access.yearGroups.includes(yearGroup);
  }

  async function create(access: CalendarAccess, event: NewCalendarEvent) {
    if (!canUseYearGroup(access, event.yearGroup)) return { status: "forbidden" } as const;
    return { status: "created", event: await dependencies.createEvent(access, event) } as const;
  }

  async function remove(access: CalendarAccess, eventId: string) {
    const event = await dependencies.findEvent(access, eventId);
    if (!event) return { status: "not-found" } as const;
    if (access.role !== "HEADTEACHER" && event.createdByMembershipId !== access.membershipId) {
      return { status: "forbidden" } as const;
    }
    await dependencies.deleteEvent(access.organisationId, eventId);
    return { status: "deleted" } as const;
  }

  return {
    list: dependencies.listEvents,
    create,
    remove,
  };
}

export type CalendarService = ReturnType<typeof createCalendarService>;
