import { z } from "zod";

export const notificationSchema = z.object({
  key: z.string().min(1).max(160),
  title: z.string().min(1),
  scope: z.string().min(1),
  content: z.string().min(1),
  href: z.string().startsWith("/"),
  read: z.boolean(),
});

export const notificationsSchema = z.object({ items: z.array(notificationSchema).max(20) });
export type Notification = z.infer<typeof notificationSchema>;
