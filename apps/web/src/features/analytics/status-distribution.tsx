import type { AnalyticsOverview } from "./analytics.schema";
import { statusLabels } from "./analytics-labels";

const statusStyles = {
  ON_TRACK: { bar: "bg-emerald-500", text: "text-emerald-700" },
  AT_RISK: { bar: "bg-amber-500", text: "text-amber-700" },
  PENDING: { bar: "bg-blue-500", text: "text-blue-700" },
  OFF_TRACK: { bar: "bg-rose-500", text: "text-rose-700" },
} as const;

export function StatusDistribution({ overview }: { overview: AnalyticsOverview }) {
  return (
    <section className="h-full w-full bg-[#fcfcfc]" aria-labelledby="status-distribution-title">
      <div className="mb-1 flex items-center justify-between border-b-2 border-[#f2f3f7cd] px-4 py-2">
        <h2 id="status-distribution-title" className="text-xs font-semibold">PERFORMANCE OVERVIEW</h2>
        <span className="text-[10px] font-semibold text-[#600bea]">{overview.cohortSize} STUDENTS</span>
      </div>

      <div className="grid gap-5 px-5 py-6 sm:grid-cols-2" role="img" aria-label="Student status distribution">
        {Object.entries(overview.statusCounts).map(([status, count]) => {
          const key = status as keyof typeof statusLabels;
          const proportion = overview.cohortSize === 0 ? 0 : count * 100 / overview.cohortSize;
          return (
            <div key={status} className="rounded-lg border border-[#f2f3f7] bg-white px-4 py-4">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className={`font-medium ${statusStyles[key].text}`}>{statusLabels[key]}</span>
                <span className="tabular-nums text-slate-600">{count} · {Math.round(proportion)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${statusStyles[key].bar}`} style={{ width: `${proportion}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <table className="sr-only">
        <caption>Status distribution values</caption>
        <thead><tr><th>Status</th><th>Students</th></tr></thead>
        <tbody>
          {Object.entries(overview.statusCounts).map(([status, count]) => (
            <tr key={status}><th>{statusLabels[status as keyof typeof statusLabels]}</th><td>{count}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
