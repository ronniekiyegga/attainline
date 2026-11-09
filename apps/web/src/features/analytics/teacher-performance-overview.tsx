import { CalendarDays, ChevronLeft, ChevronRight, TriangleAlert, Video } from "lucide-react";
import type { ReactNode } from "react";
import type { AnalyticsOverview } from "./analytics.schema";

function calendarDays(year: number, month: number) {
  const firstDay = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const previousMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    if (day < 1) return { day: previousMonthDays + day, muted: true };
    if (day > daysInMonth) return { day: day - daysInMonth, muted: true };
    return { day, muted: false };
  });
}

function DemoEvent({ color, icon, title, description }: { color: string; icon: ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-[0.77075rem] border-2 border-white bg-[#fafafa] px-4 py-3 shadow-[4.21px_16.84px_33.68px_0_rgba(219,220,230,0.50)]">
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <span className="size-1.5 rounded-full border border-neutral-100 shadow-[0_1px_6px_rgba(1,1,251,0.40)]" style={{ backgroundColor: color }} />
          <span className="flex size-8 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f2f2f2_11.47%,#fff_60.66%,#edeced_100.38%)] shadow-[4.111px_10.277px_34.839px_0_rgba(12,18,36,0.16)]">{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-gray-900">{title}</p>
          <p className="mt-1 text-[10px] leading-4 text-gray-500">{description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button type="button" disabled className="rounded-sm border border-gray-100 bg-[linear-gradient(110deg,#070a0d_46.62%,#364251_66.55%,#070a0d_88.63%)] px-3 py-1.5 text-[9px] font-medium text-white opacity-65 shadow-[0_2.49px_2.49px_-1.245px_rgba(0,0,0,0.04),0_6.224px_7.469px_-1.245px_rgba(0,0,0,0.08)]">Demo only</button>
          <span className="px-3 py-1 text-center text-[9px] font-medium text-gray-500">Unavailable</span>
        </div>
      </div>
    </div>
  );
}

export function TeacherPerformanceOverview({ overview }: { overview: AnalyticsOverview }) {
  const calendarYear = overview.academicYearStart;
  const days = calendarDays(calendarYear, 9);
  const firstYear = overview.yearGroups[0]?.yearGroup;
  const secondYear = overview.yearGroups[1]?.yearGroup ?? firstYear;

  return (
    <section className="flex min-h-[650px] w-full flex-col bg-[#fcfcfc]" aria-labelledby="teacher-performance-title">
      <div className="mb-1 flex items-center justify-between border-b-2 border-[#f2f3f7cd] px-4 py-2">
        <h2 id="teacher-performance-title" className="text-xs font-semibold text-gray-900">PERFORMANCE OVERVIEW</h2>
        <CalendarDays aria-hidden className="size-4 text-[#600bea]" />
      </div>

      <div className="grid min-h-[350px] gap-6 px-4 py-4 md:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="text-base font-bold text-gray-900">Your Next Meeting</h3>
          <p className="mt-2 max-w-md text-xs leading-5 text-gray-500">Here&apos;s your weekly overview of upcoming events and calendar notices.</p>
            </div>
            <div className="flex gap-1.5" aria-label="Assessment window filters">{["Bi-Weekly", "AWS 1", "AWS 2", "AWS 3"].map((label, index) => <button key={label} type="button" disabled className={`rounded-full border px-2.5 py-1 text-[8px] font-semibold ${index === 0 ? "border-[#dce3fb] bg-white text-[#596078]" : "border-[#e7e9f3] bg-[#fafbff] text-[#596078]"}`}>{label}</button>)}</div>
          </div>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-wide text-[#600bea]">Upcoming events</p>
          <div className="mt-3 space-y-3">
            <DemoEvent color="#22c55e" icon={<Video aria-hidden className="size-3.5" />} title={firstYear ? `Year ${firstYear} assessment review` : "Assessment review"} description={`${overview.assessedStudents} of ${overview.cohortSize} students currently have assessment evidence.`} />
            <DemoEvent color="#f97316" icon={<TriangleAlert aria-hidden className="size-3.5" />} title={secondYear ? `Year ${secondYear} priority review` : "Priority review"} description={`${overview.priorityCounts.HIGH} high-priority indicator${overview.priorityCounts.HIGH === 1 ? "" : "s"} in the visible synthetic cohort.`} />
            <DemoEvent color="#600bea" icon={<CalendarDays aria-hidden className="size-3.5" />} title="Full calendar" description="Calendar scheduling is not connected in the public demonstration." />
          </div>
        </div>

        <div className="relative rounded-[0.69656rem] bg-white px-3 py-3 shadow-[7.06px_17.65px_28.24px_7.06px_rgba(219,220,230,0.20)]">
          <div className="flex items-center justify-between">
            <button type="button" disabled aria-label="Previous month unavailable" className="flex size-8 items-center justify-center text-gray-800 disabled:opacity-100"><ChevronLeft aria-hidden className="size-4" /></button>
            <p className="text-xs font-semibold text-gray-900">October, {calendarYear}</p>
            <button type="button" disabled aria-label="Next month unavailable" className="flex size-8 items-center justify-center text-gray-800 disabled:opacity-100"><ChevronRight aria-hidden className="size-4" /></button>
          </div>
          <div className="mt-3 grid grid-cols-7 text-center text-[9px] font-semibold text-gray-500">{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[11px]">
            {days.map(({ day, muted }, index) => <span key={`${day}-${index}`} className={`mx-auto flex size-8 items-center justify-center rounded-full ${muted ? 'text-gray-300' : 'font-medium text-gray-700'} ${day === 25 && !muted ? 'border border-sky-300 text-[#600bea] shadow-sm' : ''}`}>{day}</span>)}
          </div>
          <div className="absolute bottom-3 left-3 w-32 rounded-sm border border-[#bca3ff] bg-white p-2 text-[7px] text-[#7c82a1] shadow-[4px_9px_20px_rgba(75,58,120,0.16)]">
            <p className="font-semibold text-[#23223c]">Demo calendar item</p><div className="mt-1.5 flex gap-1">{["#59c7ec", "#600bea", "#ff684d", "#34c759"].map((color) => <span key={color} className="size-2 rounded-full" style={{ backgroundColor: color }} />)}</div><p className="mt-2 leading-3">Scheduling integration unavailable</p>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-[#f2f3f7] bg-white px-5 py-5">
        <h3 className="text-xs font-medium text-gray-700">Schedule</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="relative py-3 pl-5">
            <span className="absolute inset-y-0 left-0 w-[1.6px] bg-[linear-gradient(87deg,#9cecfb_-45.69%,#65c7f7_25.96%,#0a40ff_97.6%)] shadow-[0_1px_2px_rgba(37,17,79,0.27)]" />
            <p className="text-[10px] text-gray-400">Demo schedule</p>
            <p className="mt-1 text-xs font-semibold text-gray-800">Assessment performance discussion</p>
            <span className="mt-2 inline-flex rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-600">Calendar not connected</span>
          </div>
          <div className="border-l-2 border-[#e2e0e634] px-4 py-3">
            <p className="text-[11px] font-semibold text-gray-900">Visible cohort review</p>
            <p className="mt-1 text-[10px] leading-4 text-gray-500">Synthetic assessment signals are ready for discussion; meeting actions remain unavailable.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled className="rounded-lg bg-gray-100 px-3 py-1.5 text-[10px] font-semibold text-gray-500">Flag performance</button>
              <button type="button" disabled className="rounded-lg bg-gray-100 px-3 py-1.5 text-[10px] font-semibold text-gray-500">Request meeting</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
