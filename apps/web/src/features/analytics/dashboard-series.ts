import type { AnalyticsOverview } from "./analytics.schema";
import { measureLabels, priorityLabels, statusLabels } from "./analytics-labels";
import type { MetricSeriesPoint } from "./metric-card";

function point(label: string, value: number, displayValue: string): MetricSeriesPoint {
  return { label, value, displayValue };
}

export function dashboardSeries(overview: AnalyticsOverview) {
  const status = Object.entries(overview.statusCounts).map(([key, value]) =>
    point(statusLabels[key as keyof typeof statusLabels], value, `${value} students`),
  );
  const measures = overview.measures.map((measure) =>
    point(measureLabels[measure.measure], measure.averageStandardAgeScore, `${measure.averageStandardAgeScore} SAS`),
  );
  const coverage = overview.measures.map((measure) =>
    point(measureLabels[measure.measure], measure.students, `${measure.students} students`),
  );
  const priorities = Object.entries(overview.priorityCounts).map(([key, value]) =>
    point(priorityLabels[key as keyof typeof priorityLabels], value, `${value} students`),
  );
  const yearGroups = overview.yearGroups.map(({ yearGroup, students }) =>
    point(`Year ${yearGroup}`, students, `${students} students`),
  );

  return { status, measures, coverage, priorities, yearGroups };
}
