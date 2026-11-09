import Link from "next/link";
import type { ComponentProps } from "react";
import { DEFAULT_STUDENT_SORT, type StudentSort } from "./student-sort";

export const toolbarControlClass =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-gray-200 bg-background px-3 text-xs font-normal text-zinc-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const directoryLinkClass =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-4 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground";

export type DirectoryLocation = {
  year?: number;
  search?: string;
  sort?: StudentSort;
  cursor?: string;
};

export function directoryHref({
  year,
  search,
  sort,
  cursor,
}: DirectoryLocation = {}): string {
  const parameters = new URLSearchParams();

  if (year !== undefined) {
    parameters.set("year", String(year));
  }

  if (search) {
    parameters.set("q", search);
  }

  if (sort && sort !== DEFAULT_STUDENT_SORT) {
    parameters.set("sort", sort);
  }

  if (cursor) {
    parameters.set("cursor", cursor);
  }

  const query = parameters.toString();
  return query ? `/?${query}` : "/";
}

export function DirectoryLink(props: ComponentProps<typeof Link>) {
  return <Link className={directoryLinkClass} {...props} />;
}
