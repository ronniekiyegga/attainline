import { z } from "zod";

const MAX_RANGE_DURATION_MS = 93 * 24 * 60 * 60 * 1000;
const MAX_EVENT_DURATION_MS = 24 * 60 * 60 * 1000;

const dateTimeSchema = z.iso.datetime({ offset: true });
const rangeSchema = z.strictObject({ from: dateTimeSchema, to: dateTimeSchema });
const createSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema,
  yearGroup: z.number().int().min(1).max(14).optional(),
});
const eventIdSchema = z.uuid();

function isForwardRange(from: Date, to: Date, maximumDurationMs: number) {
  const duration = to.getTime() - from.getTime();
  return duration > 0 && duration <= maximumDurationMs;
}

export function parseCalendarRange(input: unknown) {
  const result = rangeSchema.safeParse(input);
  if (!result.success) return null;

  const from = new Date(result.data.from);
  const to = new Date(result.data.to);
  return isForwardRange(from, to, MAX_RANGE_DURATION_MS) ? { from, to } : null;
}

export function parseCalendarEvent(input: unknown) {
  const result = createSchema.safeParse(input);
  if (!result.success) return null;

  const startsAt = new Date(result.data.startsAt);
  const endsAt = new Date(result.data.endsAt);
  if (!isForwardRange(startsAt, endsAt, MAX_EVENT_DURATION_MS)) return null;

  return { ...result.data, startsAt, endsAt };
}

export function parseCalendarEventId(input: unknown) {
  const result = eventIdSchema.safeParse(input);
  return result.success ? result.data : null;
}
