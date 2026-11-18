import { z } from "zod";

const yearSchema = z.strictObject({
  academicYearStart: z.coerce.number().int().min(2000).max(2200),
});

const keySchema = z.strictObject({
  notificationKey: z.string().min(1).max(160),
});

export function parseNotificationYear(input: unknown) {
  const result = yearSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function parseNotificationKey(input: unknown) {
  const result = keySchema.safeParse(input);
  return result.success ? result.data : null;
}
