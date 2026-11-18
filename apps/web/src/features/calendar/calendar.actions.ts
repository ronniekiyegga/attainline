"use server";

import { revalidatePath } from "next/cache";
import { readSessionToken } from "@/features/auth/session";
import { requestApi } from "@/server/attainline-api";
import {
  calendarEventInputSchema,
  calendarEventSchema,
  calendarEventsSchema,
  type CalendarEventInput,
} from "./calendar.schema";

export type CalendarActionResult =
  | { status: "success" }
  | { status: "invalid"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "unavailable"; message: string };

async function token() {
  return readSessionToken();
}

export async function listCalendarEventsAction(from: string, to: string) {
  const result = await requestApi({
    path: "calendar",
    query: { from, to },
    sessionToken: await token(),
    schema: calendarEventsSchema,
    expectedStatuses: [400],
  });
  return result.status === "success" ? result.data : null;
}

export async function createCalendarEventAction(input: CalendarEventInput): Promise<CalendarActionResult> {
  const parsed = calendarEventInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid event." };

  const result = await requestApi({
    method: "POST",
    path: "calendar",
    body: parsed.data,
    sessionToken: await token(),
    schema: calendarEventSchema,
    expectedStatuses: [400, 403],
  });

  if (result.status === "success") {
    revalidatePath("/dashboard");
    return { status: "success" };
  }
  if (result.status === "rejected" && result.httpStatus === 400) return { status: "invalid", message: "Check the event date and time." };
  if (result.status === "rejected" && result.httpStatus === 403) return { status: "forbidden", message: "Choose one of your assigned year groups." };
  return { status: "unavailable", message: "The calendar could not save this event." };
}

export async function deleteCalendarEventAction(eventId: string): Promise<CalendarActionResult> {
  const result = await requestApi({
    method: "DELETE",
    path: `calendar/${encodeURIComponent(eventId)}`,
    sessionToken: await token(),
    schema: calendarEventSchema.optional(),
    expectedStatuses: [400, 403, 404],
  });
  if (result.status === "success") {
    revalidatePath("/dashboard");
    return { status: "success" };
  }
  if (result.status === "rejected" && result.httpStatus === 403) return { status: "forbidden", message: "Only the event owner or a headteacher can remove it." };
  return { status: "unavailable", message: "The calendar event could not be removed." };
}
