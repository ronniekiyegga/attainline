import Link from "next/link";
import { priorityLabels, statusLabels } from "./analytics-labels";
import type { RankingPage } from "./analytics.schema";

const statusClasses = {
  ON_TRACK: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  AT_RISK: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PENDING: "bg-blue-50 text-blue-700 ring-blue-600/20",
  OFF_TRACK: "bg-rose-50 text-rose-700 ring-rose-600/20",
} as const;

export function RankingsTable({ rankings }: { rankings: RankingPage }) {
  if (rankings.items.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">No ranked results</h2>
        <p className="mt-2 text-sm text-slate-600">No students in this cohort have a recorded result for this measure.</p>
      </section>
    );
  }

  return (
    <div className="overlayCard overflow-hidden bg-[#fcfcfc]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <caption className="sr-only">Student ranking by standard age score</caption>
          <thead className="border-b-2 border-[#f2f3f7] bg-[#fcfcfc] text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-20 px-4 py-3">Rank</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Placement</th>
              <th className="px-4 py-3">SAS</th>
              <th className="px-4 py-3">Stanine</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rankings.items.map((student) => {
              const name = [student.firstName, student.surname].filter(Boolean).join(" ");
              return (
                <tr key={student.id} className="hover-gradient">
                  <td className="px-4 py-4"><span className="inline-flex size-8 items-center justify-center rounded-full border border-neutral-100 bg-white font-bold tabular-nums text-[#600bea] shadow-sm">{student.rank}</span></td>
                  <th className="px-4 py-4 font-semibold text-slate-950">
                    <Link prefetch={false} href={`/students/${student.id}?year=${rankings.academicYearStart}`} className="hover:text-[#600bea] hover:underline">{name}</Link>
                  </th>
                  <td className="px-4 py-4 text-slate-600">Year {student.yearGroup}{student.classGroup ? ` · ${student.classGroup}` : ""}</td>
                  <td className="px-4 py-4 text-base font-bold tabular-nums text-slate-950">{student.standardAgeScore}</td>
                  <td className="px-4 py-4 tabular-nums text-slate-600">{student.stanine}</td>
                  <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses[student.status]}`}>{statusLabels[student.status]}</span></td>
                  <td className="px-4 py-4 text-slate-600">{priorityLabels[student.priority]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
