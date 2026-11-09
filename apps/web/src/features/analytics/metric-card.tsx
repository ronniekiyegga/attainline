"use client";

import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { MetricInfo } from "./metric-info";

export type MetricSeriesPoint = {
  label: string;
  value: number;
  displayValue: string;
};

type MetricCardProps = {
  category: string;
  value: string;
  detail: string;
  gradient: string;
  benchmark?: { label: string; value: number };
  secondaryDetail: string;
  description: string;
  leftSeries: MetricSeriesPoint[];
  rightSeries: MetricSeriesPoint[];
  rightLabel: string;
  yearLabel: string;
  tone?: "positive" | "negative" | "neutral";
};

export function MetricCard({
  category,
  value,
  detail,
  gradient,
  benchmark,
  secondaryDetail,
  description,
  leftSeries,
  rightSeries,
  rightLabel,
  yearLabel,
  tone = "neutral",
}: MetricCardProps) {
  const [activeLeft, setActiveLeft] = useState<number | null>(null);
  const [activeRight, setActiveRight] = useState<number | null>(null);
  const leftMaximum = Math.max(...leftSeries.map(({ value: pointValue }) => pointValue), 1);
  const rightMaximum = Math.max(...rightSeries.map(({ value: pointValue }) => pointValue), 1);
  const activePoint = activeLeft === null ? undefined : leftSeries[activeLeft];
  const referenceValue = activePoint?.value ?? benchmark?.value;
  const referenceBottom = referenceValue === undefined
    ? undefined
    : Math.min(3.7, Math.max(0.22, referenceValue / leftMaximum * 3.35 + 0.1));
  const toneColor = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-500" : "text-gray-500";

  return (
    <article className="relative flex h-[166px] w-full items-start justify-between overflow-hidden rounded-[0.5rem] border border-white bg-[linear-gradient(253deg,#fff_59.04%,rgba(248,253,255,0.28)_97.02%)] px-1 pb-2 pt-2 shadow-[0_4px_10px_rgba(226,228,239,0.34)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_40%,transparent_90%)]" />
      <div className="relative z-10 flex h-full w-full flex-col justify-between">
        <div className="flex h-[48px] items-start justify-between">
          <div className="min-w-0 flex-1 px-4 py-0">
            <p className="mb-0.5 flex items-center justify-start gap-1 text-nowrap text-[7px] font-bold tracking-[0.08em] text-[#7c82a1]">
              {category}
              <MetricInfo title={category} description={description} />
            </p>
            <p className="text-nowrap text-[15px] font-bold leading-4 text-[#23223c]">{value}</p>
            <p className="mt-1 flex items-center gap-1 text-[6px] font-medium text-[#8e94b3]"><span className="size-1 rounded-full bg-[#600bea]" />Expected Level</p>
          </div>
          <MoreHorizontal aria-hidden className="mr-2 size-3.5 text-[#aaaec3]" />
        </div>
        <div className="flex w-full items-end justify-start gap-2 px-4">
          <div className="relative flex min-h-[103px] flex-1 flex-col items-start">
            <div className="relative flex h-[4rem] w-full items-end gap-[1px]" onMouseLeave={() => setActiveLeft(null)}>
              {leftSeries.slice(0, 10).map((point, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`${point.label}: ${point.displayValue}`}
                  onMouseEnter={() => setActiveLeft(index)}
                  onFocus={() => setActiveLeft(index)}
                  onBlur={() => setActiveLeft(null)}
                  className="relative inline-block min-w-0 flex-1 rounded-[0.05rem] p-0 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#600bea]"
                  style={{
                    height: `${Math.max(0.35, point.value / leftMaximum * 3.8)}rem`,
                    background: gradient,
                    opacity: activeLeft === null || activeLeft === index ? 1 : 0.8,
                  }}
                />
              ))}
              {referenceBottom === undefined ? null : <div className="pointer-events-none absolute -right-[76px] left-0 z-20 flex h-px items-center transition-[bottom]" style={{ bottom: `${referenceBottom}rem` }}>
                <div className="h-px flex-1 bg-[repeating-linear-gradient(to_right,#9ea9ff_0,#9ea9ff_4px,transparent_4px,transparent_7px)] opacity-70" />
                <span className="ml-1 whitespace-nowrap rounded-full border border-white bg-[linear-gradient(116deg,#f7f7f7_45.65%,#fff_66.36%,#f7f7f7_88.83%)] px-2 py-1 text-[6px] font-semibold text-[#7c82a1] shadow-[8px_20px_40px_rgba(219,220,230,0.5)]">
                  {activePoint?.displayValue ?? benchmark?.label}
                </span>
              </div>}
            </div>
            <div className="mt-1 h-[0.17163rem] w-full rounded-[1.83056rem]" style={{ background: gradient }} />
            <div className="mt-1.5 flex w-full flex-col gap-0.5">
              <p className="flex items-center gap-1 text-[7px] font-semibold text-[#596078]">
                <span className={`flex size-2.5 items-center justify-center rounded-full bg-[#eef1f7] text-[7px] font-bold ${toneColor}`} aria-hidden>{tone === "neutral" ? "•" : "✓"}</span>
                {detail}
              </p>
              <p className="flex items-center gap-1 text-[7px] font-semibold text-[#7c82a1]">
                <span className="text-emerald-500" aria-hidden>▲</span>
                {secondaryDetail}
              </p>
            </div>
          </div>
          <div className="relative flex min-h-[103px] w-[30%] flex-col items-start">
            <div className="relative flex h-[4rem] w-full items-end gap-[1px]" onMouseLeave={() => setActiveRight(null)}>
              <span className="absolute -top-1 right-0 z-20 rounded-full bg-white px-2 py-1 text-[6px] font-semibold text-[#596078] shadow-[2px_6px_14px_rgba(219,220,230,0.5)]">{yearLabel}</span>
              {rightSeries.slice(0, 4).map((point, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`${point.label}: ${point.displayValue}`}
                  onMouseEnter={() => setActiveRight(index)}
                  onFocus={() => setActiveRight(index)}
                  onBlur={() => setActiveRight(null)}
                  className="relative inline-block min-w-0 flex-1 rounded-[0.05rem] bg-[linear-gradient(89deg,#fff_-26.58%,#f6edff_1.03%,rgba(246,237,255,0.83)_59.4%,rgba(255,255,255,0.43)_93.32%,#fff_108.31%)] p-0 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#600bea]"
                  style={{
                    height: `${Math.max(0.35, point.value / rightMaximum * 3.4)}rem`,
                    opacity: activeRight === null || activeRight === index ? 1 : 0.8,
                  }}
                />
              ))}
            </div>
            <div className="mt-1 h-[0.17163rem] w-full rounded-[1.83056rem] bg-[linear-gradient(35deg,#7c14b8_11.9%,#6ae5e6_85.98%)]" />
            <p className="mt-1.5 text-[6px] font-medium leading-3 text-[#7c82a1]">
              {rightLabel}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
