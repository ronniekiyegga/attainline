"use client";

import Image from "next/image";
import Link from "next/link";
import { ChartNoAxesColumn, ChartPie, Columns2, Trophy } from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { RankingItem } from "./analytics.schema";

function studentName(student: Pick<RankingItem, "firstName" | "surname">) {
  return [student.firstName, student.surname].filter(Boolean).join(" ");
}

function initials(student: RankingItem) {
  return `${student.firstName?.[0] ?? ""}${student.surname[0] ?? ""}`;
}

export function RankingPreview({ items, year }: { items: RankingItem[]; year: number }) {
  const [view, setView] = useState<"bars" | "radial">("radial");
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const active = items.find((item) => item.id === activeId) ?? items[0];
  const ordered = [...items].reverse();
  const emptySlots = Math.max(0, 9 - ordered.length);
  const activeSlot = active ? emptySlots + ordered.findIndex((item) => item.id === active.id) : 0;
  const connectorX = 28 + activeSlot * 38;

  return (
    <section className="relative flex min-h-[650px] w-full flex-col gap-2 rounded-2xl px-2" aria-labelledby="ranking-preview-title">
      <div className="relative flex items-center justify-between border-b-2 border-[#f2f3f7] px-2 py-5 lg:pb-4 lg:pt-2.5">
        <div className="flex items-center gap-2"><Trophy aria-hidden className="size-4 text-amber-500" /><h2 id="ranking-preview-title" className="text-xs font-bold text-zinc-800">RANK</h2></div>
        <div className="flex items-center gap-2.5 text-[#600bea]">
          <button type="button" aria-label="Show ranking bars" aria-pressed={view === "bars"} onClick={() => setView("bars")} className="rounded-full p-1 hover:bg-violet-50"><ChartNoAxesColumn aria-hidden className="size-4" /></button>
          <button type="button" aria-label="Show selected student score" aria-pressed={view === "radial"} onClick={() => setView("radial")} className="rounded-full p-1 hover:bg-violet-50"><ChartPie aria-hidden className="size-4" /></button>
          <Link href={`/rankings?year=${year}`} aria-label="Open all rankings" className="rounded-full p-1 hover:bg-violet-50"><Columns2 aria-hidden className="size-4" /></Link>
        </div>
      </div>

      {active ? (
        <div className="relative flex flex-1 flex-col px-3">
          <div className="relative z-20 flex items-start justify-between px-2 pt-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold text-[#23223c]">{studentName(active)} <span className="text-[#34c759]">{active.standardAgeScore} SAS</span></p>
              <p className="mt-1 flex items-center text-[11px] text-[#7c82a1]"><span className="mr-2 size-1.5 rounded-full bg-[#2c0bea] shadow-[0_0.752px_4.509px_0_rgba(1,1,251,0.30)]" />Ranked {active.rank} in the visible cohort</p>
            </div>
            <p className="text-[10px] font-semibold text-[#7c82a1]">Top {Math.max(items.length, 1)} <span className="ml-1 text-teal-700">Year {active.yearGroup}</span></p>
          </div>

          {view === "bars" ? (
            <div className="relative mt-3 flex h-[300px] items-end">
              <svg aria-hidden viewBox="0 0 360 260" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible">
                <defs><linearGradient id="ranking-connector" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#3e7bfa" /><stop offset="1" stopColor="#600bea" /></linearGradient></defs>
                <path d={`M 18 20 V 106 H ${connectorX} V 155`} fill="none" stroke="url(#ranking-connector)" strokeWidth="2" strokeLinecap="round" />
                <circle cx="18" cy="20" r="4" fill="#3e7bfa" /><circle cx={connectorX} cy="155" r="4" fill="#600bea" />
              </svg>
              <div className="relative z-20 grid h-[190px] w-full grid-cols-9 items-end gap-1.5">
                {Array.from({ length: emptySlots }, (_, index) => (
                  <span key={`empty-${index}`} aria-hidden className="relative block w-full bg-[linear-gradient(181deg,#436bf4_7.5%,#4243ea_32.24%,#3373f7_51.33%,#4a21ec_67.82%,#5c09cf_92.55%)] opacity-10" style={{ height: `${2.7 + index * 0.45}rem` }} />
                ))}
                {ordered.map((student) => {
                  const selected = student.id === active.id;
                  const height = Math.max(4.2, (student.standardAgeScore - 60) / 81 * 10.5);
                  return (
                    <button key={student.id} type="button" aria-label={`${studentName(student)}: rank ${student.rank}, ${student.standardAgeScore} SAS`} aria-pressed={selected} onClick={() => setActiveId(student.id)} onFocus={() => setActiveId(student.id)} className="relative flex h-full min-w-0 items-end justify-center focus-visible:outline-2 focus-visible:outline-[#600bea]">
                      <span className="absolute z-20 flex size-7 items-center justify-center overflow-hidden rounded-full border border-neutral-100 bg-white text-[8px] font-semibold text-[#23223c] shadow" style={{ bottom: `calc(${height}rem + .35rem)` }}>
                        {student.rank <= 3 ? <Image src="/images/branding/collapsed-logo.svg" alt="" width={18} height={15} /> : initials(student)}
                      </span>
                      <span aria-hidden className="w-full bg-[linear-gradient(181deg,#436bf4_7.5%,#4243ea_32.24%,#3373f7_51.33%,#4a21ec_67.82%,#5c09cf_92.55%)] shadow-[0_4px_12px_rgba(67,107,244,0.3)] transition-transform" style={{ height: `${height}rem`, transform: selected ? "scale(1.04)" : undefined }} />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="relative flex h-[300px] items-center justify-center overflow-visible">
              <svg aria-hidden viewBox="0 0 320 300" className="pointer-events-none absolute inset-0 size-full overflow-visible">
                <defs><linearGradient id="ranking-radial-connector" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#73bfff" /><stop offset="1" stopColor="#600bea" /></linearGradient></defs>
                <path d="M 14 12 V 70 H 188 V 107" fill="none" stroke="url(#ranking-radial-connector)" strokeWidth="1.5" strokeDasharray="4 4" />
                <circle cx="14" cy="12" r="3" fill="#73bfff" /><circle cx="188" cy="107" r="3" fill="#600bea" />
              </svg>
              <div className="relative flex size-48 items-center justify-center rounded-full bg-[conic-gradient(#ff684d_0deg_46deg,#7813e9_46deg_151deg,#244bf2_151deg_223deg,#59c7ec_223deg_289deg,#e315c6_289deg_360deg)] p-[13px] shadow-[12px_18px_28px_rgba(92,33,236,0.13)]" style={{ "--score": `${Math.max(0, (active.standardAgeScore - 60) / 81 * 100)}%` } as CSSProperties}>
                <span aria-hidden className="absolute -right-2 top-[2.15rem] h-16 w-5 rotate-[36deg] rounded-full bg-[#7620f0] shadow-[0_0_18px_rgba(96,11,234,0.42)]" />
                <div className="flex size-[7.8rem] flex-col items-center justify-center rounded-full border-[10px] border-[#f7f6fb] bg-white text-center shadow-inner">
                  <span className="max-w-24 truncate text-xs font-semibold text-[#23223c]">{studentName(active)}</span>
                  <span className="mt-1 text-xs font-bold text-[#34c759]">{active.standardAgeScore} SAS</span>
                </div>
                <div className="absolute -right-14 bottom-1 grid w-44 grid-cols-[1fr_auto] gap-x-3 rounded-[0.3rem] border border-white bg-white/95 px-3 py-2 text-[8px] text-[#7c82a1] shadow-[6px_15px_30px_rgba(43,45,78,0.15)] backdrop-blur-sm">
                  <span className="font-semibold text-[#23223c]">Status</span><span>{overviewYear(year)}</span>
                  <span className="mt-2 flex items-center gap-1"><i className="size-1.5 rounded-full bg-[#600bea]" />Current score</span><span className="mt-2 font-semibold text-[#23223c]">{active.standardAgeScore} SAS</span>
                </div>
              </div>
            </div>
          )}

          <ol className="mt-auto space-y-3 pb-5">
            {items.slice(0, 3).map((student) => (
              <li key={student.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full border border-neutral-100 bg-white text-xs font-bold text-[#600bea] shadow-sm">{student.rank}</span>
                <div className="min-w-0"><Link prefetch={false} href={`/students/${student.id}?year=${year}`} className="truncate text-sm font-semibold text-slate-900 hover:text-[#600bea]">{studentName(student)}</Link><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-[linear-gradient(181deg,#436bf4_7.5%,#4243ea_32.24%,#3373f7_51.33%,#4a21ec_67.82%,#5c09cf_92.55%)]" style={{ width: `${Math.max(0, (student.standardAgeScore - 60) / 81 * 100)}%` }} /></div></div>
                <span className="text-xs font-semibold tabular-nums text-[#34c759]">{student.standardAgeScore}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : <p className="py-10 text-center text-sm text-slate-600">No CAT4 mean results are recorded for this cohort.</p>}
    </section>
  );
}

function overviewYear(year: number) {
  return `${year}/${String(year + 1).slice(-2)}`;
}
