import { FileUp, Layers } from "lucide-react";
import type { ReactNode } from "react";

export function TeacherDashboardActions({ yearNavigation }: { yearNavigation: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        disabled
        title="Export is unavailable in the public demonstration"
        className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-100 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FileUp aria-hidden className="size-3.5" />
        Export
      </button>
      <button
        type="button"
        disabled
        title="QLA tooling is outside this public migration"
        className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-100 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Layers aria-hidden className="size-3.5" />
        QLA
      </button>
      {yearNavigation}
    </div>
  );
}
