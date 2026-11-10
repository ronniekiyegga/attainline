import "server-only";

import { readSessionToken } from "@/features/auth/session";
import { requestApi } from "@/server/attainline-api";
import { notificationsSchema } from "./notification.schema";

export async function getNotifications(academicYearStart: number) {
  const result = await requestApi({
    path: "notifications",
    query: { academicYearStart: String(academicYearStart) },
    sessionToken: await readSessionToken(),
    schema: notificationsSchema,
  });
  return result.status === "success" ? result.data.items : [];
}
