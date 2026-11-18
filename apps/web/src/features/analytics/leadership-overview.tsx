import Link from "next/link";
import type { AnalyticsOverview } from "./analytics.schema";

export function LeadershipOverview({ overview }: { overview: AnalyticsOverview }) {
  const unassessed = overview.cohortSize - overview.assessedStudents;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-8">
      <section
        aria-labelledby="leadership-narrative-heading"
        className="space-y-3 rounded-xl border-2 border-violet-700/25 bg-violet-50 px-5 py-6 sm:px-6"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
          Executive operational narrative
        </p>
        <h2 id="leadership-narrative-heading" className="sr-only">Executive narrative</h2>
        <p className="text-sm leading-relaxed text-gray-900 sm:text-base">
          {overview.statusCounts.OFF_TRACK + overview.statusCounts.AT_RISK} students need leadership attention,
          while {overview.statusCounts.ON_TRACK} are currently on track. Assessment coverage is {overview.coveragePercentage}%.
        </p>
        <p className="text-sm leading-relaxed text-gray-900 sm:text-base">
          {overview.priorityCounts.HIGH} students meet the shared high-priority rule based on their latest CAT4 quantitative result.
        </p>
      </section>

      <section aria-labelledby="leadership-attention-heading" className="space-y-4 rounded-xl border border-gray-200 bg-white/40 px-5 py-6 sm:px-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Leadership attention</p>
          <h2 id="leadership-attention-heading" className="text-lg font-semibold tracking-tight">Where should leadership focus?</h2>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Off track", value: overview.statusCounts.OFF_TRACK },
            { label: "At risk", value: overview.statusCounts.AT_RISK },
            { label: "High priority", value: overview.priorityCounts.HIGH },
            { label: "Unassessed", value: unassessed },
            { label: "On track", value: overview.statusCounts.ON_TRACK },
          ].map((tile) => (
            <div key={tile.label} className="rounded-lg border border-gray-200 bg-slate-50/20 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{tile.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{tile.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="leadership-cohort-heading" className="space-y-4 rounded-xl border border-gray-200 bg-slate-50/10 px-5 py-6 sm:px-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Visible cohort</p>
          <h2 id="leadership-cohort-heading" className="text-lg font-semibold tracking-tight">By year group</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">Only year groups visible to the active school membership are included.</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
            <caption className="sr-only">Visible students by year group</caption>
            <thead>
              <tr className="border-b border-gray-200 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="pb-2 pr-4">Year</th>
                <th className="pb-2 pr-4">Students</th>
                <th className="pb-2">Share of visible cohort</th>
              </tr>
            </thead>
            <tbody>
              {overview.yearGroups.map((row) => (
                <tr key={row.yearGroup} className="border-b border-gray-200/50">
                  <th className="py-3 pr-4 font-semibold">Year {row.yearGroup}</th>
                  <td className="py-3 pr-4 tabular-nums">{row.students}</td>
                  <td className="py-3 tabular-nums">{Math.round(row.students * 100 / overview.cohortSize)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-xs text-gray-500">
        <p>Assessment detail and operational student lists remain separate views.</p>
        <div className="flex gap-3">
          <Link href={`/analytics?year=${overview.academicYearStart}`} className="font-medium text-[#600bea] hover:underline">Analytics</Link>
          <Link href={`/rankings?year=${overview.academicYearStart}`} className="font-medium text-[#600bea] hover:underline">Rankings</Link>
        </div>
      </footer>
    </div>
  );
}
