import type { RankingPage } from "./analytics.schema";

export function RankingsChart({ rankings }: { rankings: RankingPage }) {
  const chartItems = rankings.items.slice(0, 10);
  if (chartItems.length === 0) return null;
  const tallest = Math.max(...chartItems.map(({ standardAgeScore }) => standardAgeScore));

  return (
    <section className="overlayCard relative overflow-hidden bg-[#fcfcfc] px-2 pb-5" aria-labelledby="rankings-chart-title">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_40%,transparent_90%)]" />
      <div className="relative flex items-center justify-between border-b-2 border-[#f2f3f7] px-2 py-5 lg:pb-4 lg:pt-2.5">
        <h2 id="rankings-chart-title" className="flex items-center gap-1 text-xs font-bold text-zinc-800">
          <span aria-hidden>🏆</span>
          RANK
        </h2>
        <span className="text-[10px] font-semibold text-[#600bea]">STANDARD AGE SCORES</span>
      </div>
      <div className="relative mt-6 overflow-x-auto px-3">
        <div className="flex min-w-[36rem] items-end justify-center gap-2" role="img" aria-label="Ranked standard age scores on this page">
          {chartItems.map((student) => (
            <div key={student.id} className="relative flex h-48 min-w-14 flex-1 flex-col items-center justify-end">
              <span className="mb-1 flex size-7 items-center justify-center rounded-full border border-neutral-100 bg-white text-[9px] font-semibold text-[#23223c] shadow">
                {student.firstName?.slice(0, 1) ?? ""}{student.surname.slice(0, 1)}
              </span>
              <span className="mb-1 text-[10px] font-semibold tabular-nums text-[#34c759]">{student.standardAgeScore}</span>
              <div className="flex h-32 w-7 items-end">
                <div
                  className="w-full bg-[linear-gradient(181deg,#436bf4_7.5%,#4243ea_32.24%,#3373f7_51.33%,#4a21ec_67.82%,#5c09cf_92.55%)] shadow-[0_4px_12px_rgba(67,107,244,0.3)]"
                  style={{ height: `${Math.max(18, student.standardAgeScore * 100 / tallest)}%` }}
                />
              </div>
              <span className="mt-2 max-w-20 truncate text-[10px] font-semibold text-[#7c82a1]">#{student.rank} {student.surname}</span>
            </div>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Ranked standard age score values</caption>
        <thead><tr><th>Rank</th><th>Student</th><th>Score</th></tr></thead>
        <tbody>{chartItems.map((student) => <tr key={student.id}><td>{student.rank}</td><td>{student.firstName} {student.surname}</td><td>{student.standardAgeScore}</td></tr>)}</tbody>
      </table>
    </section>
  );
}
