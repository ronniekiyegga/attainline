"use client";

import { BellRing, Gift, Pin } from "lucide-react";
import { useState } from "react";
import type { AnalyticsOverview } from "./analytics.schema";

const tabs = [
  { label: "Notifications", icon: BellRing },
  { label: "Pinned", icon: Pin },
  { label: "Events", icon: Gift },
] as const;

export function TeacherUpdatesPanel({ overview }: { overview: AnalyticsOverview }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const notifications = [
    {
      date: "APR 15",
      title: `${overview.priorityCounts.HIGH} high-priority indicator${overview.priorityCounts.HIGH === 1 ? "" : "s"} flagged`,
      location: "VISIBLE COHORT",
      content: `${overview.assessedStudents} assessed students are included in the shared assessment-priority calculation.`,
    },
    {
      date: "APR 14",
      title: `Assessment coverage is ${overview.coveragePercentage}%`,
      location: `${overview.academicYearStart}/${String(overview.academicYearStart + 1).slice(-2)}`,
      content: `${overview.assessedStudents} of ${overview.cohortSize} visible students have qualifying assessment evidence.`,
    },
    {
      date: "APR 12",
      title: `${overview.statusCounts.OFF_TRACK} students currently off track`,
      location: "SHARED INDICATOR",
      content: "Status values use the authoritative assessment indicator rules and the active role scope.",
    },
  ];

  return (
    <section className="relative flex min-h-[650px] w-full min-w-[280px] flex-col overflow-hidden rounded-2xl bg-[#fcfcfc] text-black" aria-labelledby="teacher-updates-title">
      <div className="border-b border-gray-100 px-6 pb-1 pt-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold tracking-wide text-zinc-400">17 APR</span>
          <span className="size-1.5 rounded-full border border-neutral-100 bg-green-500 shadow-[0_0.752px_4.509px_0_rgba(34,197,94,0.40)]" />
          <span className="text-[10px] font-semibold text-green-600">NEW</span>
        </div>
        <p className="bg-gradient-to-tr from-[#3e7bfa] to-[#600bea] bg-clip-text text-sm font-bold text-transparent">Latest Updates</p>
      </div>

      <div className="px-6 pb-4 pt-3">
        <h2 id="teacher-updates-title" className="text-base font-semibold text-gray-900">Performance Signal Alerts</h2>
        <p className="mt-1 text-[11px] font-medium leading-4 text-gray-500">Live synthetic assessment signals across your visible classes.</p>
        <div className="mt-3 flex h-44 w-full flex-col items-center justify-center overflow-hidden rounded-md bg-[radial-gradient(ellipse_at_18%_20%,rgba(38,203,255,0.8),transparent_19%),repeating-radial-gradient(ellipse_at_80%_110%,rgba(120,76,255,0.8)_0_8px,transparent_10px_22px),linear-gradient(135deg,#071a9b_0%,#2435e4_38%,#600bea_100%)] shadow-sm">
          <span className="relative z-10 text-lg font-bold tracking-wide text-white">NOTIFICATIONS</span>
          <span className="mt-3 h-px w-3/4 bg-gradient-to-r from-transparent via-sky-300 to-transparent" />
        </div>
        <p className="mt-4 bg-gradient-to-r from-[#513efa] to-[#600bea] bg-clip-text text-[11px] font-bold text-transparent">NOTIFICATIONS</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
        {activeIndex === 0 ? (
          <div className="space-y-4">
            {notifications.map((notice, index) => (
              <article key={notice.title} className="relative pl-6">
                <span className="absolute left-0 top-1 size-1.5 rounded-full border border-neutral-100 bg-[#600bea] shadow-[0_0.752px_4.509px_0_rgba(1,1,251,0.40)]" />
                {index < notifications.length - 1 ? <span className="absolute bottom-[-1.25rem] left-[3px] top-5 w-px bg-zinc-100" /> : null}
                <p className="text-[9px] font-medium tracking-wide text-zinc-400">{notice.date}</p>
                <h3 className="mt-0.5 text-xs font-semibold text-gray-900">{notice.title}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-[9px] font-medium tracking-wider text-zinc-400"><span>{notice.location}</span><span aria-hidden className="h-2 w-px bg-gray-300" /><span>READ MORE</span></div>
                <p className="mt-2 line-clamp-3 text-[10px] font-medium leading-4 text-gray-500">{notice.content}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-center">
            <p className="text-xs font-semibold text-gray-800">{activeIndex === 1 ? "No pinned updates" : "No connected events"}</p>
            <p className="mt-2 text-[10px] leading-4 text-gray-500">This integration is unavailable in the public demonstration.</p>
          </div>
        )}
      </div>

      <div className="flex w-full justify-between px-4 pb-3 pt-4 shadow-[0_-2px_12px_0_rgba(92,101,195,0.15)]">
        {tabs.map((tab, index) => (
          <button key={tab.label} type="button" aria-pressed={activeIndex === index} onClick={() => setActiveIndex(index)} className={`relative flex w-1/3 flex-col items-center text-[9px] font-medium transition-colors ${activeIndex === index ? "text-[#600bea]" : "text-zinc-500 hover:text-gray-800"}`}>
            <tab.icon aria-hidden className="mb-1 size-4" />
            {tab.label}
            {tab.label === "Events" ? <span className="absolute -right-1 -top-1 rounded-full bg-red-400 px-1.5 py-0.5 text-[7px] font-bold text-white">NEW</span> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
