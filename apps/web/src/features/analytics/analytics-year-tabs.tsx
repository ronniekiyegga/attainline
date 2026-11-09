import Link from "next/link";
import { formatAcademicYear } from "@/features/students/academic-year";

type AnalyticsYearTabsProps = {
  years: number[];
  selectedYear: number;
  pathname: string;
  parameters?: Record<string, string | number | undefined>;
};

export function AnalyticsYearTabs({
  years,
  selectedYear,
  pathname,
  parameters = {},
}: AnalyticsYearTabsProps) {
  return (
    <nav aria-label="Academic year" className="flex items-center gap-1 overflow-x-auto pb-1">
      <ul className="flex h-auto min-w-max flex-wrap items-center overflow-hidden rounded-[0.5rem] border border-gray-50 bg-[#fafafa] p-1 shadow-[4px_10px_15px_0_rgba(219,220,230,0.30)]">
        {years.map((year) => {
          const query = new URLSearchParams({ year: String(year) });
          for (const [name, value] of Object.entries(parameters)) {
            if (value !== undefined) query.set(name, String(value));
          }

          const selected = year === selectedYear;
          return (
            <li key={year}>
              <Link
                href={`${pathname}?${query}`}
                aria-current={selected ? "page" : undefined}
                className="inline-flex min-h-[34px] items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-[9px] font-semibold uppercase text-gray-500 transition hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:rounded-[0.375rem] aria-[current=page]:border-[0.169px] aria-[current=page]:border-[#f2f2f2] aria-[current=page]:bg-white aria-[current=page]:bg-[linear-gradient(114deg,rgba(62,123,250,0.02)_20.34%,rgba(102,0,204,0.04)_36.8%,rgba(102,0,204,0.03)_56.12%,rgba(62,123,250,0.02)_76.52%)] aria-[current=page]:text-[#600bea] aria-[current=page]:shadow-[0_3px_3px_-1.5px_rgba(0,0,0,0.08),0_8px_10px_-1.5px_rgba(0,0,0,0.05)]"
              >
                {formatAcademicYear(year)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
