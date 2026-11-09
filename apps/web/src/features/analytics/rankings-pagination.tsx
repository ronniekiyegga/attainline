import Link from "next/link";
import type { RankingMeasure } from "./analytics.schema";

type RankingParameters = {
  year: number;
  measure: RankingMeasure;
  yearGroup?: number;
};

function rankingHref(page: number, parameters: RankingParameters) {
  const query = new URLSearchParams({
    year: String(parameters.year),
    measure: parameters.measure,
    page: String(page),
  });
  if (parameters.yearGroup !== undefined) {
    query.set("yearGroup", String(parameters.yearGroup));
  }
  return `/rankings?${query}`;
}

export function RankingsPagination({
  page,
  totalPages,
  parameters,
}: {
  page: number;
  totalPages: number;
  parameters: RankingParameters;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Rankings pagination" className="flex items-center justify-end gap-2">
      {page > 1 ? (
        <Link
          href={rankingHref(page - 1, parameters)}
          rel="prev"
          className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-gray-900 shadow-sm hover:bg-gray-50"
        >
          Previous
        </Link>
      ) : null}
      {page < totalPages ? (
        <Link
          href={rankingHref(page + 1, parameters)}
          rel="next"
          className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-gray-900 shadow-sm hover:bg-gray-50"
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
}
