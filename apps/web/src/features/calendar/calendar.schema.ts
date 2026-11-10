import { z } from "zod";

export const calendarEventSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullable(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  yearGroup: z.number().int().min(1).max(14).nullable(),
  createdByMembershipId: z.uuid(),
});

export const calendarEventsSchema = z.object({ items: z.array(calendarEventSchema).max(200) });
export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const calendarEventInputSchema = z.object({
  title: z.string().trim().min(1, "Enter an event title.").max(120),
  description: z.string().trim().max(500).optional(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  yearGroup: z.number().int().min(1).max(14).optional(),
});
export type CalendarEventInput = z.infer<typeof calendarEventInputSchema>;
