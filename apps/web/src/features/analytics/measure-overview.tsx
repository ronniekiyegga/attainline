import { Trophy } from "lucide-react";
import type { CSSProperties } from "react";
import type { AnalyticsOverview } from "./analytics.schema";
import { measureLabels } from "./analytics-labels";

type MeasureSummary = AnalyticsOverview["measures"][number];

const cognitiveMeasures = new Set([
  "CAT4_MEAN",
  "CAT4_VERBAL",
  "CAT4_QUANTITATIVE",
  "CAT4_NON_VERBAL",
  "CAT4_SPATIAL",
]);

function AttainmentPanel({
  title,
  measures,
  caption,
  palette,
}: {
  title: string;
  measures: MeasureSummary[];
  caption: string;
  palette: "internal" | "external";
}) {
  const sasGradient = palette === "internal"
    ? "linear-gradient(135deg,#5b8def 10.15%,#0063f7 87.05%)"
    : "linear-gradient(135deg,#ac32e4 0%,#7918f2 47.87%,#4801ff 100%)";
  const stanineGradient = palette === "internal"
    ? "linear-gradient(135deg,#00cfde 3.63%,#05a660 94.05%)"
    : "linear-gradient(135deg,#ff8800 3.63%,#e63535 94.05%)";

  return (
    <section className="rounded-lg border bg-white text-gray-900 shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight">{title}</h2>
      </div>
      {measures.length === 0 ? (
        <p className="px-6 pb-10 text-center text-sm text-slate-600">No results are recorded for these measures.</p>
      ) : (
        <>
          <div className="flex items-center justify-center gap-4 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: sasGradient }} aria-hidden />
              <span className="text-xs text-gray-600">Average SAS scale</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: stanineGradient }} aria-hidden />
              <span className="text-xs text-gray-600">Average stanine scale</span>
            </div>
          </div>
          <div className="overflow-x-auto px-6">
            <div className="relative h-[500px] min-w-[30rem] pb-12 pl-10 pr-4 pt-6" role="group" aria-label={`${title} average standard age score and stanine scales`}>
              <div aria-hidden className="absolute bottom-12 left-10 right-4 top-6 bg-[repeating-linear-gradient(to_bottom,#e5e7eb_0,#e5e7eb_1px,transparent_1px,transparent_20%)]" />
              <div aria-hidden className="absolute bottom-12 left-0 top-6 flex w-9 flex-col justify-between text-right text-[10px] text-gray-500">
                {[100, 80, 60, 40, 20, 0].map((tick) => <span key={tick}>{tick}</span>)}
              </div>
              <div className="relative flex h-full items-end gap-4">
                {measures.map((measure) => {
                  const sasHeight = Math.max(4, (measure.averageStandardAgeScore - 60) * 100 / 81);
                  const stanineHeight = Math.max(4, measure.averageStanine * 100 / 9);
                  const bars = [
                    { label: "Average SAS", value: measure.averageStandardAgeScore, height: sasHeight, gradient: sasGradient },
                    { label: "Average stanine", value: measure.averageStanine, height: stanineHeight, gradient: stanineGradient },
                  ];

                  return (
                    <div key={measure.measure} className="flex h-full min-w-16 flex-1 flex-col items-center justify-end">
                      <div className="flex h-full w-full items-end justify-center gap-1.5">
                        {bars.map((bar) => (
                          <button
                            key={bar.label}
                            type="button"
                            aria-label={`${measureLabels[measure.measure]} ${bar.label}: ${bar.value}`}
                            className="group relative flex h-full w-full max-w-10 items-end rounded-t focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#600bea]"
                          >
                            <span
                              aria-hidden
                              className="w-full rounded-t transition-opacity group-hover:opacity-85 group-focus-visible:opacity-85"
                              style={{ height: `${bar.height}%`, background: bar.gradient }}
                            />
                            <span
                              role="tooltip"
                              className="pointer-events-none absolute left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-lg group-hover:block group-focus:block"
                              style={{ bottom: `calc(${bar.height}% + 0.5rem)` } as CSSProperties}
                            >
                              {bar.label}: {bar.value}
                            </span>
                          </button>
                        ))}
                      </div>
                      <span className="mt-2 min-h-10 text-center text-[10px] font-semibold leading-tight text-slate-600">
                        {measureLabels[measure.measure]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mx-6 overflow-x-auto">
            <table className="mx-auto mb-12 mt-6 w-full min-w-[32rem] border-collapse pb-0 text-left text-sm shadow-lg shadow-gray-200/40">
              <caption className="sr-only">{caption}</caption>
              <thead className="rounded-t-lg bg-gray-800 text-white">
                <tr>
                  <th className="w-[120px] rounded-tl-lg px-3 py-2.5">Measure</th>
                  <th className="px-3 py-2.5">Students</th>
                  <th className="px-3 py-2.5">Average SAS</th>
                  <th className="rounded-tr-lg px-3 py-2.5 text-right">Average stanine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {measures.map((measure) => (
                  <tr key={measure.measure} className="font-medium">
                    <th className="px-3 py-3">{measureLabels[measure.measure]}</th>
                    <td className="px-3 py-3 tabular-nums">{measure.students}</td>
                    <td className="px-3 py-3 tabular-nums">{measure.averageStandardAgeScore}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{measure.averageStanine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function KeyFindings({ overview }: { overview: AnalyticsOverview }) {
  const strongest = overview.measures.reduce<MeasureSummary | undefined>(
    (current, measure) => current === undefined || measure.averageStandardAgeScore > current.averageStandardAgeScore
      ? measure
      : current,
    undefined,
  );

  const findings = [
    {
      heading: "Assessment coverage:",
      detail: `${overview.assessedStudents} of ${overview.cohortSize} visible students have at least one result in this academic year (${overview.coveragePercentage}%).`,
    },
    {
      heading: "Cohort attainment:",
      detail: overview.averageStandardAgeScore === null
        ? "No qualifying status-indicator score is available for this cohort."
        : `The shared status indicators produce a cohort mean of ${overview.averageStandardAgeScore} SAS, with ${overview.statusCounts.ON_TRACK} students currently on track.`,
    },
    {
      heading: "Strongest recorded measure:",
      detail: strongest === undefined
        ? "No assessment measure has a recorded result."
        : `${measureLabels[strongest.measure]} has the highest recorded average at ${strongest.averageStandardAgeScore} SAS across ${strongest.students} students.`,
    },
  ];

  return (
    <section className="mb-8 rounded-lg border bg-white text-gray-900 shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <div className="flex items-center gap-2">
          <Trophy aria-hidden className="size-5 text-blue-600" />
          <h2 className="text-2xl font-semibold leading-none tracking-tight text-blue-800">Attainment Analysis Key Findings</h2>
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="space-y-6">
          {findings.map((finding) => (
            <div className="border-l-4 border-indigo-500 pl-4" key={finding.heading}>
              <h3 className="mb-2 font-semibold text-orange-800">{finding.heading}</h3>
              <p className="text-gray-700">{finding.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MeasureOverview({ overview }: { overview: AnalyticsOverview }) {
  const cognitive = overview.measures.filter(({ measure }) => cognitiveMeasures.has(measure));
  const readingAndProgress = overview.measures.filter(({ measure }) => !cognitiveMeasures.has(measure));

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 text-center lg:grid-cols-2">
        <AttainmentPanel
          title="2.1 Cognitive attainment"
          measures={cognitive}
          caption="Assessment averages and cohort coverage"
          palette="internal"
        />
        <AttainmentPanel
          title="2.2 Reading and Progress Test attainment"
          measures={readingAndProgress}
          caption="Standardised assessment averages and cohort coverage"
          palette="external"
        />
      </div>
      <KeyFindings overview={overview} />
    </>
  );
}
