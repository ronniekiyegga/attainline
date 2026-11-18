"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Calendar, FileText, Hash, ListFilter } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { toolbarControlClass } from "./directory-link";

export const optionalColumns = [
  { id: "reference", label: "Student reference", icon: FileText },
  { id: "yearGroup", label: "Year group", icon: Calendar },
  { id: "classGroup", label: "Class", icon: Hash },
] as const;

export type OptionalColumn = (typeof optionalColumns)[number]["id"];

type StudentColumns = {
  isVisible: (column: OptionalColumn) => boolean;
  toggle: (column: OptionalColumn) => void;
};

const StudentColumnsContext = createContext<StudentColumns | null>(null);

export function StudentColumnsProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<ReadonlySet<OptionalColumn>>(new Set());

  function toggle(column: OptionalColumn) {
    setHidden((current) => {
      const next = new Set(current);

      if (!next.delete(column)) {
        next.add(column);
      }

      return next;
    });
  }

  return (
    <StudentColumnsContext.Provider
      value={{ isVisible: (column) => !hidden.has(column), toggle }}
    >
      {children}
    </StudentColumnsContext.Provider>
  );
}

export function useStudentColumns(): StudentColumns {
  const columns = useContext(StudentColumnsContext);

  if (!columns) {
    throw new Error("useStudentColumns must be used inside StudentColumnsProvider");
  }

  return columns;
}

export function ColumnToggle() {
  const { isVisible, toggle } = useStudentColumns();

  return (
    <Dialog.Root modal={false}>
      <div className="relative">
        <Dialog.Trigger className={toolbarControlClass}>
          <ListFilter className="h-4 w-4 shrink-0 text-zinc-800" aria-hidden="true" />
          <span className="text-xs leading-none">Columns</span>
        </Dialog.Trigger>
        <Dialog.Content className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-gray-50 bg-white px-1 py-2 shadow-lg focus:outline-none">
          <Dialog.Title className="px-2 py-1 text-xs font-medium text-muted-foreground">
            Columns
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Choose which columns the student table shows.
          </Dialog.Description>
          <ul>
            {optionalColumns.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <label className="hover-gradient relative flex cursor-pointer items-center gap-2 rounded-sm p-2 text-sm text-gray-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                  <input
                    type="checkbox"
                    checked={isVisible(id)}
                    onChange={() => toggle(id)}
                    className="peer sr-only"
                  />
                  <span className="flex size-6 items-center justify-center">
                    <Icon size={14} color="#374151" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <span
                    aria-hidden="true"
                    className="flex size-5 items-center justify-center rounded-full bg-gray-100 text-xs opacity-0 peer-checked:opacity-100"
                  >
                    <span className="bg-[linear-gradient(63.4deg,#3E7BFA_35%,#6600CC_72%)] bg-clip-text text-transparent">
                      ✓
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </div>
    </Dialog.Root>
  );
}
