import type { AnalyticsOverview } from "./analytics.schema";
import { MetricCard } from "./metric-card";
import { RankingPreview } from "./ranking-preview";
import { TeacherPerformanceOverview } from "./teacher-performance-overview";
import { TeacherUpdatesPanel } from "./teacher-updates-panel";
import { teacherWidgetSeries } from "./teacher-widget-series";

export function DashboardOverview({ overview }: { overview: AnalyticsOverview }) {
  const average = overview.averageStandardAgeScore;
  const trendSeries = teacherWidgetSeries("trend", overview.onTrackPercentage, 55, "Cohort signal", `${overview.onTrackPercentage}% on track`);
  const baselineSeries = teacherWidgetSeries("baseline", average ?? 0, 100, "Baseline signal", average === null ? "No baseline" : `${average} SAS`);
  const outcomeScore = overview.cohortSize === 0 ? 0 : 100 - overview.priorityCounts.HIGH / overview.cohortSize * 100;
  const outcomeSeries = teacherWidgetSeries("outcome", outcomeScore, 75, "Priority signal", `${overview.priorityCounts.HIGH} high priority`);
  const interventionSeries = teacherWidgetSeries("intervention", overview.coveragePercentage, 90, "Coverage signal", `${overview.coveragePercentage}% assessed`);

  return (
    <div>
      <section
        className="flex w-full items-center justify-center overflow-x-hidden px-2 py-4 lg:mb-4 lg:py-6"
        aria-label="Cohort overview"
      >
        <div className="grid w-full min-w-0 auto-rows-min grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 lg:place-content-center">
        <MetricCard
          category="PROGRESS"
          value={`${overview.onTrackPercentage}%`}
          detail={overview.onTrackPercentage >= 55 ? "Above target" : "Below target"}
          gradient="linear-gradient(181deg,#436bf4 7.5%,#4243ea 32.24%,#3373f7 51.33%,#4a21ec 67.82%,#5c09cf 92.55%)"
          secondaryDetail={`${overview.statusCounts.OFF_TRACK} off track`}
          description="Current status uses the shared assessment indicator applied to each visible student's latest qualifying results."
          benchmark={{ label: "55% benchmark", value: 3 }}
          leftSeries={trendSeries.left}
          rightSeries={trendSeries.right}
          rightLabel="Visible cohort"
          yearLabel={`Year ${overview.yearGroups[0]?.yearGroup ?? "—"}`}
        />
        <MetricCard
          category="ATTAINMENT"
          value={average === null ? "Not available" : `${average} SAS`}
          detail="Current mean SAS"
          gradient="linear-gradient(225deg,#ac32e4 0%,#7918f2 47.87%,#4801ff 100%)"
          benchmark={{ label: "100 SAS", value: 3 }}
          secondaryDetail={`${overview.assessedStudents} assessed`}
          description="Current baseline is the mean of the latest status-indicator standard age scores for visible students."
          leftSeries={baselineSeries.left}
          rightSeries={baselineSeries.right}
          rightLabel={`${overview.assessedStudents} assessed`}
          yearLabel={`Year ${overview.yearGroups[0]?.yearGroup ?? "—"}`}
          tone={average === null ? "neutral" : average >= 100 ? "positive" : "negative"}
        />
        <MetricCard
          category="KHDA RATING"
          value="FOCUS AREAS"
          detail={overview.priorityCounts.HIGH === 0 ? "Exceeding standards" : "Priority indicators"}
          gradient="linear-gradient(144deg,#00cfde 3.63%,#05a660 94.05%)"
          benchmark={{ label: "75% benchmark", value: 3 }}
          secondaryDetail={`${overview.priorityCounts.HIGH} high priority`}
          description="Focus areas are derived from the shared assessment-priority rules for the visible cohort; no predictive service is connected."
          leftSeries={outcomeSeries.left}
          rightSeries={outcomeSeries.right}
          rightLabel="Prediction service unavailable"
          yearLabel={`Year ${overview.yearGroups[0]?.yearGroup ?? "—"}`}
        />
        <MetricCard
          category="RECOMMENDATIONS"
          value={`${overview.coveragePercentage}%`}
          detail="Assessment coverage"
          gradient="linear-gradient(144deg,#ff3b3b 3.63%,#6600cc 94.05%)"
          benchmark={{ label: "90% benchmark", value: 3 }}
          secondaryDetail={`${overview.assessedStudents} of ${overview.cohortSize} assessed`}
          description="The intervention integration is unavailable; this card preserves the original presentation using truthful assessment coverage."
          leftSeries={interventionSeries.left}
          rightSeries={interventionSeries.right}
          rightLabel="Intervention service unavailable"
          yearLabel={`Year ${overview.yearGroups[0]?.yearGroup ?? "—"}`}
          tone={overview.coveragePercentage >= 90 ? "positive" : "negative"}
        />
        </div>
      </section>

      <div className="mb-8 grid grid-flow-row-dense grid-cols-1 place-items-center gap-2 p-2 lg:grid-cols-2 lg:place-items-stretch xl:grid-cols-4">
        <div className="overlayCard relative flex h-full w-full min-w-0 max-w-[780px] flex-col overflow-hidden bg-white lg:col-span-2 lg:max-w-none xl:col-span-2 xl:row-span-2">
          <TeacherPerformanceOverview overview={overview} />
        </div>
        <div className="overlayCard relative flex h-full w-full min-w-0 max-w-[360px] flex-col items-center justify-center overflow-hidden rounded-[0.5rem] bg-[linear-gradient(253deg,#fff_59.04%,rgba(248,253,255,0.28)_97.02%)] lg:max-w-none">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_40%,transparent_90%)]" />
          <RankingPreview items={overview.topRankings} year={overview.academicYearStart} />
        </div>
        <div className="overlayCard relative flex h-full w-full min-w-0 max-w-[360px] flex-col items-center justify-center overflow-hidden rounded-[0.5rem] bg-[linear-gradient(253deg,#fff_59.04%,rgba(248,253,255,0.28)_97.02%)] lg:max-w-none">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_40%,transparent_90%)]" />
          <TeacherUpdatesPanel overview={overview} />
        </div>
      </div>
    </div>
  );
}
