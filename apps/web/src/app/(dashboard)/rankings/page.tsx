import { Suspense } from "react";
import { getRankings } from "@/features/analytics/analytics.api";
import { measureLabels } from "@/features/analytics/analytics-labels";
import { AnalyticsLoading, AnalyticsUnavailable, ForbiddenRankings, InvalidRankings, NoAnalyticsCohort } from "@/features/analytics/analytics-states";
import { resolveAnalyticsYear, type DashboardSearchParams } from "@/features/analytics/analytics-year";
import { AnalyticsYearTabs } from "@/features/analytics/analytics-year-tabs";
import { DashboardWelcomeHeader } from "@/features/analytics/dashboard-welcome-header";
import { InstitutionalDashboardShell } from "@/features/analytics/institutional-dashboard-shell";
import { RankingsChart } from "@/features/analytics/rankings-chart";
import { RankingsControls } from "@/features/analytics/rankings-controls";
import { RankingsPagination } from "@/features/analytics/rankings-pagination";
import { parseRankingsQuery } from "@/features/analytics/rankings-query";
import { RankingsTable } from "@/features/analytics/rankings-table";
import { formatAcademicYear } from "@/features/students/academic-year";

export default function RankingsPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  return (
    <Suspense fallback={<AnalyticsLoading label="Loading rankings" />}>
      <RankingsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RankingsContent({ searchParams }: { searchParams: DashboardSearchParams }) {
  const resolved = await resolveAnalyticsYear(searchParams);
  if (resolved.status === "unavailable") return <InstitutionalDashboardShell><AnalyticsUnavailable /></InstitutionalDashboardShell>;
  if (resolved.status === "empty") return <InstitutionalDashboardShell><NoAnalyticsCohort /></InstitutionalDashboardShell>;
  if (resolved.status === "invalid") return <InstitutionalDashboardShell><InvalidRankings /></InstitutionalDashboardShell>;

  const query = parseRankingsQuery(resolved.parameters);
  if (!query.success) return <InstitutionalDashboardShell><InvalidRankings /></InstitutionalDashboardShell>;

  const rankings = await getRankings({
    academicYearStart: resolved.year,
    measure: query.data.measure,
    yearGroup: query.data.yearGroup,
    page: query.data.page,
  });

  if (rankings.status === "unavailable") return <InstitutionalDashboardShell><AnalyticsUnavailable /></InstitutionalDashboardShell>;
  if (rankings.status === "forbidden") return <InstitutionalDashboardShell><ForbiddenRankings /></InstitutionalDashboardShell>;
  if (rankings.data.cohortSize === 0) return <InstitutionalDashboardShell><NoAnalyticsCohort /></InstitutionalDashboardShell>;

  const parameters = { year: resolved.year, measure: query.data.measure, yearGroup: query.data.yearGroup };

  return (
    <InstitutionalDashboardShell
      hero={
        <DashboardWelcomeHeader
          eyebrow="Assessment intelligence"
          title="Student rankings"
          subtitle={`Latest ${measureLabels[query.data.measure]} results for ${formatAcademicYear(resolved.year)}.`}
          meta={<p className="text-[11px] text-gray-500">Ranking ties use surname and student ID · Synthetic data only</p>}
          trailing={
            <AnalyticsYearTabs
              years={resolved.years}
              selectedYear={resolved.year}
              pathname="/rankings"
              parameters={{ measure: query.data.measure, yearGroup: query.data.yearGroup }}
            />
          }
        />
      }
    >
      <RankingsControls
        year={resolved.year}
        measure={query.data.measure}
        yearGroup={query.data.yearGroup}
        availableYearGroups={rankings.data.availableYearGroups}
      />
      <div className="space-y-6">
        <RankingsChart rankings={rankings.data} />
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-gray-500">
          <p>{rankings.data.total} ranked {rankings.data.total === 1 ? "student" : "students"}</p>
          <p>Page {rankings.data.page} of {Math.max(1, rankings.data.totalPages)}</p>
        </div>
        <RankingsTable rankings={rankings.data} />
        <RankingsPagination page={rankings.data.page} totalPages={rankings.data.totalPages} parameters={parameters} />
      </div>
    </InstitutionalDashboardShell>
  );
}
