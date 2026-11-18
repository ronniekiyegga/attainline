import { z } from "zod";

const signInSchema = z.strictObject({
  email: z.string().trim().toLowerCase().min(3).max(254),
  password: z.string().min(1).max(1024),
});

const organisationSwitchSchema = z.strictObject({
  organisationId: z.uuid(),
});

export function parseSignInRequest(input: unknown) {
  const result = signInSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function parseOrganisationSwitchRequest(input: unknown) {
  const result = organisationSwitchSchema.safeParse(input);
  return result.success ? result.data : null;
}
