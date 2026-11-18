import type { AnalyticsService } from "../analytics/analytics.service.js";
import type { StudentAccess } from "../students/student.repository.js";
import type { listReadKeys, markNotificationRead } from "./notification.repository.js";

type NotificationActor = StudentAccess & { membershipId: string };
type Dependencies = {
  overview: AnalyticsService["overview"];
  listReads: typeof listReadKeys;
  markRead: typeof markNotificationRead;
};

export function createNotificationService({ overview, listReads, markRead }: Dependencies) {
  async function list(actor: NotificationActor, academicYearStart: number) {
    const [analytics, reads] = await Promise.all([
      overview(actor, academicYearStart),
      listReads(actor.organisationId, actor.membershipId),
    ]);
    const notifications = [
      {
        key: `assessment:${academicYearStart}:priority:${analytics.priorityCounts.HIGH}`,
        title: `${analytics.priorityCounts.HIGH} high-priority indicator${analytics.priorityCounts.HIGH === 1 ? "" : "s"} flagged`,
        scope: "VISIBLE COHORT",
        content: `${analytics.assessedStudents} assessed students are included in the shared assessment-priority calculation.`,
        href: `/analytics?year=${academicYearStart}`,
      },
      {
        key: `assessment:${academicYearStart}:coverage:${analytics.coveragePercentage}`,
        title: `Assessment coverage is ${analytics.coveragePercentage}%`,
        scope: `${academicYearStart}/${String(academicYearStart + 1).slice(-2)}`,
        content: `${analytics.assessedStudents} of ${analytics.cohortSize} visible students have qualifying assessment evidence.`,
        href: `/analytics?year=${academicYearStart}`,
      },
      {
        key: `assessment:${academicYearStart}:off-track:${analytics.statusCounts.OFF_TRACK}`,
        title: `${analytics.statusCounts.OFF_TRACK} students currently off track`,
        scope: "SHARED INDICATOR",
        content: "Status values use the authoritative assessment indicator rules and the active role scope.",
        href: `/rankings?year=${academicYearStart}`,
      },
    ];
    return notifications.map((notification) => ({ ...notification, read: reads.has(notification.key) }));
  }

  async function read(actor: NotificationActor, notificationKey: string) {
    await markRead(actor.organisationId, actor.membershipId, notificationKey);
  }

  return { list, read };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
