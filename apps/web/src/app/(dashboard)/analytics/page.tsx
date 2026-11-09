import { Suspense } from "react";
import { getAnalyticsOverview } from "@/features/analytics/analytics.api";
import { AnalyticsLoading, AnalyticsUnavailable, InvalidAnalyticsYear, NoAnalyticsCohort } from "@/features/analytics/analytics-states";
import { AnalyticsYearTabs } from "@/features/analytics/analytics-year-tabs";
import { resolveAnalyticsYear, type DashboardSearchParams } from "@/features/analytics/analytics-year";
import { InstitutionalDashboardShell } from "@/features/analytics/institutional-dashboard-shell";
import { MeasureOverview } from "@/features/analytics/measure-overview";
import { formatAcademicYear } from "@/features/students/academic-year";

export default function AnalyticsPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  return (
    <Suspense fallback={<AnalyticsLoading label="Loading analytics" />}>
      <AnalyticsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AnalyticsContent({ searchParams }: { searchParams: DashboardSearchParams }) {
  const resolved = await resolveAnalyticsYear(searchParams);

  if (resolved.status === "unavailable") return <InstitutionalDashboardShell><AnalyticsUnavailable /></InstitutionalDashboardShell>;
  if (resolved.status === "empty") return <InstitutionalDashboardShell><NoAnalyticsCohort /></InstitutionalDashboardShell>;
  if (resolved.status === "invalid") {
    const [year] = resolved.years;
    return <InstitutionalDashboardShell><InvalidAnalyticsYear href={year === undefined ? "/analytics" : `/analytics?year=${year}`} /></InstitutionalDashboardShell>;
  }

  const overview = await getAnalyticsOverview(resolved.year);

  return (
    <InstitutionalDashboardShell>
      {overview.status !== "success" ? <AnalyticsUnavailable /> : overview.data.cohortSize === 0 ? <NoAnalyticsCohort /> : (
        <div className="space-y-6">
          <section className="relative mb-6 flex flex-col gap-4 rounded-lg bg-slate-50 p-4 md:flex-row md:items-end">
            <div>
              <p className="mb-2 block text-sm font-semibold text-gray-600">Academic Year:</p>
              <AnalyticsYearTabs years={resolved.years} selectedYear={resolved.year} pathname="/analytics" />
            </div>
            {[
              ["Select Group:", "Visible cohort"],
              ["Year Group:", "Role scope"],
              ["Subgroups:", "All synthetic students"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="mb-2 block text-sm font-semibold text-gray-600">{label}</p>
                <p className="flex h-[34px] w-full items-center rounded-md border border-purple-200 bg-white px-3 text-sm text-gray-700 md:w-40">
                  {value}
                </p>
              </div>
            ))}
          </section>
          <div>
            <h1 className="text-xl font-semibold">Attainment Analysis</h1>
            <p className="mt-1 text-sm text-gray-600">
              Attainment and assessment coverage for {formatAcademicYear(resolved.year)}.
            </p>
          </div>
          <MeasureOverview overview={overview.data} />
        </div>
      )}
    </InstitutionalDashboardShell>
  );
}
