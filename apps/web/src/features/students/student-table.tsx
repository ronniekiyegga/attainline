"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  directoryHref,
  studentProfileHref,
  type DirectoryLocation,
} from "./directory-link";
import { optionalColumns, useStudentColumns } from "./student-columns";
import type { StudentPage } from "./student-page.schema";
import { DEFAULT_STUDENT_SORT, type StudentSort } from "./student-sort";

type Student = StudentPage["items"][number];

const headerClass =
  "h-12 whitespace-nowrap py-4 text-left align-middle text-slate-600";
const headerLabelClass = "text-xs font-semibold";
const cellClass = "px-4 py-2 align-middle text-xs text-muted-foreground";

function TableFrame({
  caption,
  header,
  children,
}: {
  caption: string;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white shadow-xs">
      <div className="scrollbar-thin relative w-full overflow-x-auto">
        <table className="w-full min-w-[36rem] caption-bottom text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead
            className="sticky top-0 z-20"
            style={{
              background:
                "linear-gradient(180deg, #FBFBFB 68.72%, #F4F7FF 130.66%)",
            }}
          >
            <tr className="border-b">{header}</tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function displayName(student: Student) {
  return student.firstName
    ? `${student.firstName} ${student.surname}`
    : student.surname;
}

function SortableStudentHeader({ location }: { location: DirectoryLocation }) {
  const sort: StudentSort = location.sort ?? DEFAULT_STUDENT_SORT;
  const descending = sort === "surname-desc";
  const Icon = descending ? ChevronDown : ChevronUp;

  return (
    <th
      scope="col"
      aria-sort={descending ? "descending" : "ascending"}
      className={`${headerClass} pl-8 pr-4`}
    >
      <Link
        href={directoryHref({
          ...location,
          cursor: undefined,
          sort: descending ? "surname-asc" : "surname-desc",
        })}
        className={`${headerLabelClass} inline-flex items-center gap-2 rounded-md hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        Student
        <Icon size={14} className="ml-1 opacity-70" aria-hidden="true" />
        <span className="sr-only">
          {descending
            ? ", sorted by surname Z to A. Sort A to Z"
            : ", sorted by surname A to Z. Sort Z to A"}
        </span>
      </Link>
    </th>
  );
}

type StudentTableProps = {
  students: Student[];
  caption: string;
  emptyMessage: string;
  location: DirectoryLocation & { year: number };
};

export function StudentTable({
  students,
  caption,
  emptyMessage,
  location,
}: StudentTableProps) {
  const { isVisible } = useStudentColumns();
  const visibleHeaders = optionalColumns.filter(({ id }) => isVisible(id));

  return (
    <TableFrame
        caption={caption}
        header={
          <>
            <SortableStudentHeader location={location} />
            {visibleHeaders.map(({ id, label }) => (
              <th key={id} scope="col" className={`${headerClass} px-4`}>
                <span className={headerLabelClass}>{label}</span>
              </th>
            ))}
            <th scope="col" className={`${headerClass} px-4`}>
              <span className="sr-only">Details</span>
            </th>
          </>
        }
      >
        {students.length === 0 ? (
          <tr>
            <td
              colSpan={visibleHeaders.length + 2}
              className="h-24 text-center text-xs text-muted-foreground"
            >
              {emptyMessage}
            </td>
          </tr>
        ) : (
          students.map((student) => (
            <tr
              key={student.id}
              className="hover-gradient relative h-16 border-b border-l-2 border-l-transparent transition-all duration-200 ease-in-out"
            >
              <th
                scope="row"
                className="whitespace-nowrap py-2 pl-8 pr-4 text-left align-middle text-xs font-normal text-muted-foreground"
              >
                {displayName(student)}
              </th>
              {isVisible("reference") && (
                <td className={`${cellClass} break-all`}>
                  {student.institutionStudentRef}
                </td>
              )}
              {isVisible("yearGroup") && (
                <td className={`${cellClass} whitespace-nowrap`}>
                  Year {student.yearGroup}
                </td>
              )}
              {isVisible("classGroup") && (
                <td className={`${cellClass} whitespace-nowrap`}>
                  {student.classGroup ?? (
                    <span className="text-slate-600">Not recorded</span>
                  )}
                </td>
              )}
              <td className="px-4 py-2 text-right align-middle">
                <Link
                  href={studentProfileHref(student.id, location)}
                  scroll={false}
                  prefetch={false}
                  data-profile-link={student.id}
                  aria-label={`View profile for ${displayName(student)}`}
                  className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  View
                </Link>
              </td>
            </tr>
          ))
        )}
      </TableFrame>
  );
}

const skeletonWidths = ["w-28", "w-20", "w-12", "w-10", "w-8"];

export function StudentTableSkeleton() {
  return (
    <div role="status" aria-label="Loading students">
      <TableFrame
        caption="Loading students"
        header={
          <>
            <th scope="col" className={`${headerClass} pl-8 pr-4`}>
              <span className={headerLabelClass}>Student</span>
            </th>
            {optionalColumns.map(({ id, label }) => (
              <th key={id} scope="col" className={`${headerClass} px-4`}>
                <span className={headerLabelClass}>{label}</span>
              </th>
            ))}
            <th scope="col" className={`${headerClass} px-4`}>
              <span className="sr-only">Details</span>
            </th>
          </>
        }
      >
        {Array.from({ length: 10 }, (_, row) => (
          <tr
            key={row}
            aria-hidden="true"
            className="h-16 border-b border-l-2 border-l-transparent"
          >
            {skeletonWidths.map((width, index) => (
              <td
                key={width}
                className={`py-2 align-middle ${index === 0 ? "pl-8 pr-4" : "px-4"}`}
              >
                <div className={`h-4 ${width} animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none`} />
              </td>
            ))}
          </tr>
        ))}
      </TableFrame>
    </div>
  );
}
