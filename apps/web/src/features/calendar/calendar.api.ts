import "server-only";

import { readSessionToken } from "@/features/auth/session";
import { requestApi } from "@/server/attainline-api";
import { calendarEventsSchema } from "./calendar.schema";

export async function getCalendarEvents(from: Date, to: Date) {
  const result = await requestApi({
    path: "calendar",
    query: { from: from.toISOString(), to: to.toISOString() },
    sessionToken: await readSessionToken(),
    schema: calendarEventsSchema,
  });
  return result.status === "success" ? result.data.items : [];
}
