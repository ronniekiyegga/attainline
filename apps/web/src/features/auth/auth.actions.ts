"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requestApi } from "@/server/attainline-api";
import { readSessionToken, SESSION_COOKIE } from "./session";

export type SignInState = {
  error?: string;
  email: string;
};

const credentialsSchema = z.object({
  email: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(1024),
});

const issuedSessionSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  expiresAt: z.iso.datetime(),
});

const organisationIdSchema = z.uuid();

const signInErrors: Record<number, string> = {
  400: "Enter your email address and password.",
  403: "This account has no active school membership.",
  429: "Too many failed attempts. Try again in 30 minutes.",
};

async function storeSession({ token, expiresAt }: z.infer<typeof issuedSessionSchema>) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const credentials = credentialsSchema.safeParse({
    email,
    password: formData.get("password"),
  });

  if (!credentials.success) {
    return { email, error: signInErrors[400] };
  }

  const result = await requestApi({
    method: "POST",
    path: "auth/sessions",
    body: credentials.data,
    schema: issuedSessionSchema,
    expectedStatuses: [400, 403, 429],
  });

  if (result.status === "unauthenticated") {
    return { email, error: "Email or password is incorrect." };
  }

  if (result.status === "rejected") {
    return { email, error: signInErrors[result.httpStatus] };
  }

  if (result.status === "unavailable") {
    return { email, error: "Sign-in is unavailable. Try again shortly." };
  }

  await storeSession(result.data);
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const sessionToken = await readSessionToken();

  if (sessionToken) {
    await requestApi({
      method: "DELETE",
      path: "auth/session",
      sessionToken,
      schema: z.undefined(),
    });
  }

  (await cookies()).delete(SESSION_COOKIE);
  redirect("/sign-in");
}

export async function switchOrganisation(formData: FormData): Promise<void> {
  const organisationId = organisationIdSchema.safeParse(formData.get("organisationId"));
  const sessionToken = await readSessionToken();

  if (!organisationId.success || !sessionToken) {
    redirect("/dashboard");
  }

  const result = await requestApi({
    method: "PUT",
    path: "auth/session/organisation",
    body: { organisationId: organisationId.data },
    sessionToken,
    schema: issuedSessionSchema,
    expectedStatuses: [403],
  });

  if (result.status === "unauthenticated") {
    (await cookies()).delete(SESSION_COOKIE);
    redirect("/sign-in");
  }

  if (result.status === "success") {
    await storeSession(result.data);
  }

  redirect("/dashboard");
}
