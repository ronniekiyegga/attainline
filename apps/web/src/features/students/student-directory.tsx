import Link from "next/link";
import { academicYearParamSchema, formatAcademicYear } from "./academic-year";
import { AcademicYearTabs } from "./academic-year-tabs";
import {
  DirectoryLink,
  directoryHref,
  toolbarControlClass,
  type DirectoryLocation,
} from "./directory-link";
import { RefreshButton } from "./refresh-button";
import {
  getAcademicYears,
  getStudents,
  type StudentPageResult,
} from "./student.api";
import { ColumnToggle } from "./student-columns";
import {
  DirectoryUnavailable,
  InvalidAcademicYear,
  InvalidCursor,
  InvalidSearch,
  InvalidSort,
  NoEnrolments,
} from "./student-directory-states";
import { StudentSearch } from "./student-search";
import { studentSearchSchema } from "./student-search.schema";
import { studentSortParamSchema } from "./student-sort";
import { StudentTable } from "./student-table";

type StudentDirectoryProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function StudentDirectory({ searchParams }: StudentDirectoryProps) {
  const parameters = await searchParams;
  const parsedSearch = studentSearchSchema.safeParse(parameters.q);

  if (!parsedSearch.success) {
    return <InvalidSearch />;
  }

  const search = parsedSearch.data || undefined;
  const requestedYear = academicYearParamSchema.safeParse(parameters.year);
  const parsedSort = studentSortParamSchema.safeParse(parameters.sort);

  if (!requestedYear.success) {
    return <InvalidAcademicYear search={search} sort={parsedSort.data} />;
  }

  if (!parsedSort.success) {
    return <InvalidSort year={requestedYear.data} search={search} />;
  }

  const sort = parsedSort.data;
  const { cursor } = parameters;

  if (cursor !== undefined && (typeof cursor !== "string" || cursor === "")) {
    return <InvalidCursor year={requestedYear.data} search={search} sort={sort} />;
  }

  const years = await getAcademicYears();

  if (years.status === "unavailable") {
    return (
      <DirectoryUnavailable
        year={requestedYear.data}
        search={search}
        sort={sort}
        cursor={cursor}
      />
    );
  }

  const [currentYear] = years.data;

  if (currentYear === undefined) {
    return <NoEnrolments />;
  }

  const year = requestedYear.data ?? currentYear;

  if (!years.data.includes(year)) {
    return <InvalidAcademicYear search={search} sort={sort} />;
  }

  const result = await getStudents({ academicYearStart: year, sort, cursor, search });

  return (
    <div className="flex w-full flex-col justify-start gap-1 space-y-4">
      <div className="flex w-full flex-col items-stretch justify-between gap-2 md:flex-row md:items-center">
        <AcademicYearTabs
          years={years.data}
          selectedYear={year}
          search={search}
          sort={sort}
        />
        <StudentSearch search={search ?? ""} year={year} sort={sort}>
          {search && (
            <Link href={directoryHref({ year, sort })} className={toolbarControlClass}>
              Clear search
            </Link>
          )}
          <RefreshButton />
          <ColumnToggle />
        </StudentSearch>
      </div>

      <DirectoryResult
        result={result}
        location={{ year, search, sort }}
        cursor={cursor}
      />
    </div>
  );
}

type DirectoryResultProps = {
  result: StudentPageResult;
  location: DirectoryLocation & { year: number };
  cursor?: string;
};

function DirectoryResult({ result, location, cursor }: DirectoryResultProps) {
  if (result.status === "invalid-cursor") {
    return <InvalidCursor {...location} />;
  }

  if (result.status === "unavailable") {
    return <DirectoryUnavailable {...location} cursor={cursor} />;
  }

  const { items, nextCursor } = result.data;
  const yearLabel = formatAcademicYear(location.year);
  const order = location.sort === "surname-desc" ? "Z to A" : "A to Z";

  const emptyMessage = cursor
    ? "No students on this page. Return to the first page."
    : location.search
      ? `No students in ${yearLabel} match this search.`
      : `No students are enrolled in ${yearLabel}.`;

  return (
    <div className="flex flex-col gap-4">
      <StudentTable
        students={items}
        caption={`Students enrolled in ${yearLabel}, ordered by surname ${order}`}
        emptyMessage={emptyMessage}
        location={location}
      />

      <div className="flex min-h-[3.25rem] flex-wrap items-center justify-between gap-2 py-2">
        <p className="text-xs text-muted-foreground">
          {items.length > 0 &&
            `Showing ${items.length} ${items.length === 1 ? "student" : "students"} · ${yearLabel}`}
        </p>
        <nav
          aria-label="Student directory pagination"
          className="flex items-center gap-2"
        >
          {cursor && (
            <DirectoryLink href={directoryHref(location)}>
              First page
            </DirectoryLink>
          )}
          {nextCursor && (
            <DirectoryLink
              href={directoryHref({ ...location, cursor: nextCursor })}
              rel="next"
            >
              Next page
            </DirectoryLink>
          )}
        </nav>
      </div>
    </div>
  );
}
