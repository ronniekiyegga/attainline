import { measureLabels } from "./analytics-labels";
import {
  RANKING_MEASURES,
  type RankingMeasure,
} from "./analytics.schema";

type RankingsControlsProps = {
  year: number;
  measure: RankingMeasure;
  yearGroup?: number;
  availableYearGroups: number[];
};

export function RankingsControls({
  year,
  measure,
  yearGroup,
  availableYearGroups,
}: RankingsControlsProps) {
  return (
    <form
      action="/rankings"
      method="get"
      className="relative mb-6 flex flex-col gap-4 rounded-lg bg-slate-50 p-4 md:flex-row"
    >
      <input type="hidden" name="year" value={year} />
      <label className="block text-sm font-semibold text-gray-600">
        Assessment measure
        <select
          name="measure"
          defaultValue={measure}
          className="mt-2 h-10 w-full rounded-md border border-purple-200 bg-white px-3 text-sm text-gray-900 md:w-56"
        >
          {RANKING_MEASURES.map((value) => (
            <option key={value} value={value}>
              {measureLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold text-gray-600">
        Year group
        <select
          name="yearGroup"
          defaultValue={yearGroup ?? ""}
          className="mt-2 h-10 w-full rounded-md border border-purple-200 bg-white px-3 text-sm text-gray-900 md:w-48"
        >
          <option value="">All visible year groups</option>
          {availableYearGroups.map((value) => (
            <option key={value} value={value}>
              Year {value}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="h-10 self-end rounded-md border border-zinc-100 bg-white px-5 text-xs font-medium text-gray-900 shadow-sm hover:bg-gray-50"
      >
        Apply filters
      </button>
    </form>
  );
}
