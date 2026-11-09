import { ChartNoAxesColumn } from "lucide-react";
import { Fragment } from "react";
import { formatAcademicYear } from "./academic-year";
import type { AssessmentMeasure, StudentAssessments } from "./student-page.schema";

const measureLabels: Record<AssessmentMeasure, string> = {
  CAT4_MEAN: "CAT4 mean",
  CAT4_VERBAL: "CAT4 verbal reasoning",
  CAT4_QUANTITATIVE: "CAT4 quantitative reasoning",
  CAT4_NON_VERBAL: "CAT4 non-verbal reasoning",
  CAT4_SPATIAL: "CAT4 spatial ability",
  NGRT_READING: "NGRT reading",
  PTE: "Progress Test in English",
  PTM: "Progress Test in Maths",
  PTS: "Progress Test in Science",
};

const measureOrder: AssessmentMeasure[] = [
  "CAT4_MEAN",
  "CAT4_VERBAL",
  "CAT4_QUANTITATIVE",
  "CAT4_NON_VERBAL",
  "CAT4_SPATIAL",
  "NGRT_READING",
  "PTE",
  "PTM",
  "PTS",
];

const priorityStyles = {
  LOW: { label: "Low", color: "#34C759" },
  MEDIUM: { label: "Medium", color: "#ea580c" },
  HIGH: { label: "High", color: "#AC0A01" },
} as const;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

function ordinal(value: number): string {
  const suffix = value % 100 >= 11 && value % 100 <= 13
    ? "th"
    : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[value % 10] ?? "th";
  return `${value}${suffix}`;
}

function listMeasures(measures: AssessmentMeasure[]): string {
  const labels = measures.map((measure) => measureLabels[measure]);
  return labels.length > 1
    ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`
    : labels.join("");
}

type Result = StudentAssessments["results"][number];

function scoreSummary(result: Result): string {
  return [
    `Standard age score ${result.standardAgeScore}`,
    `stanine ${result.stanine}`,
    result.nationalPercentileRank !== null && `${ordinal(result.nationalPercentileRank)} percentile`,
    result.rawScore !== null && `raw score ${result.rawScore} of ${result.rawScoreMaximum}`,
  ].filter(Boolean).join(" · ");
}

function comparison(result: Result): string {
  if (!result.previous) {
    return "No earlier sitting recorded";
  }

  const change = result.standardAgeScore - result.previous.standardAgeScore;
  const signed = change > 0 ? `+${change}` : String(change);

  return `Previous sitting ${formatDate(result.previous.satOn)}: SAS ${result.previous.standardAgeScore}, stanine ${result.previous.stanine} (SAS ${signed})`;
}

function Separator() {
  return (
    <li aria-hidden className="flex justify-center py-3">
      <div className="h-px w-full bg-[#610bea0f]" />
    </li>
  );
}

export function AssessmentResults({ assessments }: { assessments: StudentAssessments }) {
  const { status, priority } = assessments;
  const year = formatAcademicYear(assessments.academicYearStart);
  const results = measureOrder.flatMap((measure) =>
    assessments.results.filter((result) => result.measure === measure));
  const priorityStyle = priorityStyles[priority.value];

  return (
    <section aria-label={`Assessment results for ${year}`} className="mb-8 pl-6 pr-4">
      <ul>
        <li className="w-full py-1">
          <p className="text-xs font-semibold text-gray-900">Status and priority</p>
          <p className="mb-1 text-xs text-gray-500">
            {status.basedOn.length > 0
              ? `Average standard age score ${status.averageStandardAgeScore} across ${listMeasures(status.basedOn)}.`
              : `No CAT4 mean, Progress Test in English or NGRT reading result in ${year}.`}
          </p>
          <p className="flex items-center gap-2 whitespace-nowrap">
            <ChartNoAxesColumn aria-hidden color={priorityStyle.color} size={14} />
            <span className="text-xs text-gray-500">{priorityStyle.label} priority</span>
            <span aria-hidden className="h-3 w-px bg-gray-200" />
            <span className="truncate text-xs text-gray-500">
              {priority.basedOn
                ? `CAT4 quantitative reasoning SAS ${priority.standardAgeScore}`
                : "No CAT4 quantitative reasoning result"}
            </span>
          </p>
        </li>

        {results.length === 0 ? (
          <>
            <Separator />
            <li className="py-1 text-xs text-gray-500">No assessment results recorded in {year}.</li>
          </>
        ) : (
          results.map((result) => (
            <Fragment key={result.measure}>
              <Separator />
              <li className="w-full py-1">
                <p className="flex w-full items-center justify-between gap-3 text-xs font-semibold text-gray-900">
                  {measureLabels[result.measure]}
                  <span className="shrink-0 text-[11px] font-medium text-gray-500">
                    {formatDate(result.satOn)}
                  </span>
                </p>
                <p className="mb-1 text-xs text-gray-500">{scoreSummary(result)}</p>
                <p className="text-[11px] text-gray-500">{comparison(result)}</p>
              </li>
            </Fragment>
          ))
        )}
      </ul>
    </section>
  );
}
