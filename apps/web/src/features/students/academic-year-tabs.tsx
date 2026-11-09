import Link from "next/link";
import { formatAcademicYear } from "./academic-year";
import { directoryHref } from "./directory-link";
import type { StudentSort } from "./student-sort";

type AcademicYearTabsProps = {
  years: number[];
  selectedYear: number;
  search?: string;
  sort: StudentSort;
};

export function AcademicYearTabs({
  years,
  selectedYear,
  search,
  sort,
}: AcademicYearTabsProps) {
  return (
    <nav aria-label="Academic year" className="flex items-center gap-1">
      <ul className="flex h-auto flex-wrap items-center overflow-hidden rounded-[0.5rem] border border-gray-50 bg-[#FAFAFA] p-1 shadow-[4px_10px_15px_0_rgba(219,220,230,0.30)]">
        {years.map((year) => (
          <li key={year}>
            <Link
              href={directoryHref({ year, search, sort })}
              aria-current={year === selectedYear ? "page" : undefined}
              className="inline-flex min-h-[34px] items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-[9px] font-semibold uppercase text-gray-500 transition hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:rounded-[0.375rem] aria-[current=page]:border-[0.169px] aria-[current=page]:border-[#F2F2F2] aria-[current=page]:bg-white aria-[current=page]:bg-[linear-gradient(114deg,rgba(62,123,250,0.02)_20.34%,rgba(102,0,204,0.04)_36.8%,rgba(102,0,204,0.03)_56.12%,rgba(62,123,250,0.02)_76.52%)] aria-[current=page]:text-[#600BEA] aria-[current=page]:shadow-[0_3px_3px_-1.5px_rgba(0,0,0,0.08),0_8px_10px_-1.5px_rgba(0,0,0,0.05)]"
            >
              {formatAcademicYear(year)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
