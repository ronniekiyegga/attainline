import { Suspense } from "react";
import { getSession } from "@/features/auth/session";
import { getAnalyticsOverview } from "@/features/analytics/analytics.api";
import { DashboardOverview } from "@/features/analytics/dashboard-overview";
import { AnalyticsLoading, AnalyticsUnavailable, InvalidAnalyticsYear, NoAnalyticsCohort } from "@/features/analytics/analytics-states";
import { AnalyticsYearTabs } from "@/features/analytics/analytics-year-tabs";
import { resolveAnalyticsYear, type DashboardSearchParams } from "@/features/analytics/analytics-year";
import { DashboardWelcomeHeader } from "@/features/analytics/dashboard-welcome-header";
import { InstitutionalDashboardShell } from "@/features/analytics/institutional-dashboard-shell";
import { dashboardRoleLabel } from "@/features/analytics/dashboard-role";
import { LeadershipOverview } from "@/features/analytics/leadership-overview";
import { TeacherDashboardActions } from "@/features/analytics/teacher-dashboard-actions";
import { formatAcademicYear } from "@/features/students/academic-year";
import { getCalendarEvents } from "@/features/calendar/calendar.api";
import { getNotifications } from "@/features/notifications/notification.api";

export default function DashboardPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  return (
    <Suspense fallback={<AnalyticsLoading label="Loading dashboard" />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({ searchParams }: { searchParams: DashboardSearchParams }) {
  const [session, resolved] = await Promise.all([getSession(), resolveAnalyticsYear(searchParams)]);

  if (resolved.status === "unavailable" || session.status === "unavailable") {
    return <InstitutionalDashboardShell><AnalyticsUnavailable /></InstitutionalDashboardShell>;
  }
  if (resolved.status === "empty") {
    return <InstitutionalDashboardShell><NoAnalyticsCohort /></InstitutionalDashboardShell>;
  }
  if (resolved.status === "invalid") {
    const [year] = resolved.years;
    return <InstitutionalDashboardShell><InvalidAnalyticsYear href={year === undefined ? "/dashboard" : `/dashboard?year=${year}`} /></InstitutionalDashboardShell>;
  }
  if (session.status !== "signed-in") return null;

  const calendarFrom = new Date(Date.UTC(resolved.year, 9, 1));
  const calendarTo = new Date(Date.UTC(resolved.year, 10, 1));
  const [overview, calendarEvents, notifications] = await Promise.all([
    getAnalyticsOverview(resolved.year),
    getCalendarEvents(calendarFrom, calendarTo),
    getNotifications(resolved.year),
  ]);

  return (
    <InstitutionalDashboardShell
      hero={
        <DashboardWelcomeHeader
          titleId="teacher-dashboard-overview"
          title={`Welcome Back, ${dashboardRoleLabel(session.session.role)} 👋🏽`}
          subtitle={session.session.role === "TEACHER"
            ? "Your class performance signals, updated live."
            : `Your cohort performance signals for ${formatAcademicYear(resolved.year)}.`}
          meta={<p className="sr-only">Synthetic demo data only</p>}
          trailing={session.session.role === "TEACHER"
            ? (
                <TeacherDashboardActions
                  yearNavigation={<AnalyticsYearTabs years={resolved.years} selectedYear={resolved.year} pathname="/dashboard" />}
                />
              )
            : <AnalyticsYearTabs years={resolved.years} selectedYear={resolved.year} pathname="/dashboard" />}
        />
      }
    >
      {overview.status === "success"
        ? overview.data.cohortSize === 0
          ? <NoAnalyticsCohort />
          : session.session.role === "HEADTEACHER"
            ? <LeadershipOverview overview={overview.data} />
            : <DashboardOverview overview={overview.data} calendarEvents={calendarEvents} visibleYearGroups={session.session.yearGroups} notifications={notifications} />
        : <AnalyticsUnavailable />}
    </InstitutionalDashboardShell>
  );
}
