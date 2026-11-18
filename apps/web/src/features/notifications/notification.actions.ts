"use server";

import { z } from "zod";
import { readSessionToken } from "@/features/auth/session";
import { requestApi } from "@/server/attainline-api";

const keySchema = z.string().min(1).max(160);

export async function markNotificationReadAction(key: string) {
  const parsed = keySchema.safeParse(key);
  if (!parsed.success) return false;
  const result = await requestApi({
    method: "PUT",
    path: "notifications/read",
    body: { notificationKey: parsed.data },
    sessionToken: await readSessionToken(),
    schema: z.undefined(),
  });
  return result.status === "success";
}
