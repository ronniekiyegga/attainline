import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { toolbarControlClass } from "./directory-link";
import { MAX_SEARCH_LENGTH } from "./student-search.schema";
import { DEFAULT_STUDENT_SORT, type StudentSort } from "./student-sort";

type StudentSearchProps = {
  search: string;
  year: number;
  sort: StudentSort;
  children?: ReactNode;
};

export function StudentSearch({ search, year, sort, children }: StudentSearchProps) {
  return (
    <form
      action="/"
      method="get"
      role="search"
      aria-label="Student directory"
      className="flex w-full flex-wrap items-center justify-between gap-2 md:w-auto"
    >
      <input type="hidden" name="year" value={year} />
      <div className="relative flex w-full md:w-auto md:min-w-0">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <label htmlFor="student-search" className="sr-only">
          Search by first name, surname or student reference
        </label>
        <input
          key={search}
          id="student-search"
          name="q"
          type="search"
          defaultValue={search}
          maxLength={MAX_SEARCH_LENGTH}
          placeholder="Search"
          autoComplete="off"
          className="h-9 w-full rounded-md border border-gray-200 bg-background py-2 pl-9 pr-3 text-sm outline-offset-4 md:w-48"
        />
      </div>
      {sort !== DEFAULT_STUDENT_SORT && (
        <input type="hidden" name="sort" value={sort} />
      )}
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:justify-start">
        <button type="submit" className={toolbarControlClass}>
          Search
        </button>
        {children}
      </div>
    </form>
  );
}
