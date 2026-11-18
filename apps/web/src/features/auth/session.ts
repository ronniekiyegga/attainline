import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { z } from "zod";
import { requestApi } from "@/server/attainline-api";

export const SESSION_COOKIE = "attainline_session";

const organisationSchema = z.object({ id: z.uuid(), name: z.string().min(1) });

const sessionSchema = z.object({
  user: z.object({ email: z.string(), displayName: z.string().min(1) }),
  organisation: organisationSchema,
  role: z.enum(["HEADTEACHER", "HEAD_OF_YEAR", "TEACHER"]),
  yearGroups: z.array(z.number().int().positive()).nullable(),
  organisations: z.array(organisationSchema).min(1),
});

export type Session = z.infer<typeof sessionSchema>;

export type SessionResult =
  | { status: "signed-in"; session: Session }
  | { status: "signed-out" }
  | { status: "unavailable" };

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export const getSession = cache(async (): Promise<SessionResult> => {
  const sessionToken = await readSessionToken();

  if (!sessionToken) {
    return { status: "signed-out" };
  }

  const result = await requestApi({ path: "auth/session", sessionToken, schema: sessionSchema });

  if (result.status === "success") {
    return { status: "signed-in", session: result.data };
  }

  return result.status === "unauthenticated" ? { status: "signed-out" } : { status: "unavailable" };
});
