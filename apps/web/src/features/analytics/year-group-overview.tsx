import type { AnalyticsOverview } from "./analytics.schema";

export function YearGroupOverview({ overview }: { overview: AnalyticsOverview }) {
  const maximum = Math.max(...overview.yearGroups.map(({ students }) => students), 1);

  return (
    <section className="overlayCard overflow-hidden bg-[#fcfcfc]" aria-labelledby="year-group-overview-title">
      <div className="border-b-2 border-[#f2f3f7] px-4 py-3">
        <p className="text-[10px] font-bold tracking-[0.14em] text-gray-500">VISIBLE COHORT</p>
        <h2 id="year-group-overview-title" className="mt-1 text-xl font-semibold text-gray-900">Students by year group</h2>
      </div>
      <ul className="space-y-4 px-5 py-6">
        {overview.yearGroups.map(({ yearGroup, students }) => (
          <li key={yearGroup}>
            <div className="mb-1.5 flex justify-between text-sm"><span className="font-medium text-slate-800">Year {yearGroup}</span><span className="tabular-nums text-slate-600">{students}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[linear-gradient(107deg,#494af9_50.12%,#4243ea_57.75%,#3373f7_63.63%,#3f54ec_68.72%,#4f2bdc_76.34%)]" style={{ width: `${students * 100 / maximum}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
