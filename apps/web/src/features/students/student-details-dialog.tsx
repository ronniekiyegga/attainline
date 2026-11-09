"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { RefObject } from "react";
import { formatAcademicYear } from "./academic-year";
import type { StudentDetails } from "./student-page.schema";

export type SelectedStudent = {
  details: StudentDetails;
  name: string;
  initials: string;
};

type StudentDetailsDialogProps = {
  student: SelectedStudent | null;
  year: number;
  returnFocusTo: RefObject<HTMLElement | null>;
  onClose: () => void;
};

export function StudentDetailsDialog({
  student,
  year,
  returnFocusTo,
  onClose,
}: StudentDetailsDialogProps) {
  return (
    <Dialog.Root open={student !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusTo.current?.focus();
          }}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2.5rem] bg-white shadow-xl focus:outline-none"
        >
          <div className="relative w-full overflow-hidden rounded-[2.5rem] border-[2.5px] border-[rgba(255,255,255,0.6)] bg-[#fcfcfc] shadow-[8px_20px_40px_0_rgba(219,220,230,0.5)]">
            <div className="relative bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Student details</span>
                <Dialog.Close className="rounded-full px-4 py-2 text-[11px] font-semibold text-zinc-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Close
                </Dialog.Close>
              </div>
            </div>

            <div className="relative z-10 mb-2 flex justify-center px-6 py-6">
              <div aria-hidden="true" className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(#CFB1FF_1px,transparent_1px)] [background-size:20px_20px]" />
                <div className="absolute inset-0 bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
              </div>
              <div
                className="relative z-10 w-full max-w-sm p-6 text-white"
                style={{
                  borderRadius: "1rem",
                  background: "linear-gradient(187deg, #5F5F5F 5.38%, #292929 92.39%)",
                }}
              >
                <div className="flex w-full items-start justify-between">
                  <div
                    aria-hidden="true"
                    className="mr-5 flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-semibold"
                  >
                    {student?.initials}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5 pt-1">
                    <Dialog.Title className="text-xs font-semibold text-white">
                      {student?.name}
                    </Dialog.Title>
                    <Dialog.Description className="text-[11px] font-medium text-gray-100">
                      Placement for {formatAcademicYear(year)}
                    </Dialog.Description>
                    <div className="my-2 h-px w-full bg-[#6d6f75]" />
                    {student && <PlacementList details={student.details} />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PlacementList({ details }: { details: StudentDetails }) {
  const { institutionStudentRef, yearGroup, classGroup } = details;

  return (
    <dl className="space-y-2 text-[11px]">
      {[
        ["Student reference", institutionStudentRef],
        ["Year group", `Year ${yearGroup}`],
        ["Class", classGroup ?? "Not recorded"],
      ].map(([label, value], index) => (
        <div key={label}>
          {index > 0 && <div className="mb-2 h-px w-full bg-[#54565a]" />}
          <div className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-gray-200">{label}</dt>
            <dd className="min-w-0 text-right text-white [overflow-wrap:anywhere]">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
