"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChartNoAxesCombined, LayoutDashboard, Search, Trophy, Users, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const commands = [
  { label: "Dashboard", description: "Open cohort performance", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", description: "Inspect assessment analytics", href: "/analytics", icon: ChartNoAxesCombined },
  { label: "Rankings", description: "Compare student rankings", href: "/rankings", icon: Trophy },
  { label: "Student directory", description: "Find a student profile", href: "/", icon: Users },
] as const;

export function CommandPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const matches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized
      ? commands.filter(({ label, description }) => `${label} ${description}`.toLocaleLowerCase().includes(normalized))
      : commands;
  }, [query]);

  function select(href: string) {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    if (href !== pathname) router.push(href);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setQuery("");
        setActiveIndex(0);
      }
    }}>
      <Dialog.Trigger asChild>
        <button type="button" className="flex h-8 w-44 items-center gap-2 rounded-md border border-gray-100 bg-white px-2 text-xs text-gray-400 shadow-sm hover:border-gray-200 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#600bea]">
          <Search aria-hidden className="size-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-[10px]">⌘ K</kbd>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#090c18]/65 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby="command-panel-description"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          className="fixed left-1/2 top-[18vh] z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_32px_90px_rgba(17,20,43,0.32)] focus:outline-none"
        >
          <Dialog.Title className="sr-only">Navigate Attainline</Dialog.Title>
          <Dialog.Description id="command-panel-description" className="sr-only">Search the available Attainline pages and open the selected destination.</Dialog.Description>
          <div className="flex items-center border-b border-[#eeedf5] px-5">
            <Search aria-hidden className="size-5 text-[#7c75a4]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((index) => Math.max(index - 1, 0));
                } else if (event.key === "Enter" && matches[activeIndex]) {
                  event.preventDefault();
                  select(matches[activeIndex].href);
                }
              }}
              role="combobox"
              aria-expanded="true"
              aria-controls="command-panel-results"
              aria-activedescendant={matches[activeIndex] ? `command-${matches[activeIndex].href}` : undefined}
              placeholder="Search dashboards, analytics, rankings and students..."
              className="h-16 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#23223c] outline-none placeholder:text-[#9592aa]"
            />
            <Dialog.Close className="flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#600bea]" aria-label="Close command panel">
              <X aria-hidden className="size-4" />
            </Dialog.Close>
          </div>
          <div id="command-panel-results" role="listbox" className="max-h-[min(24rem,60vh)] overflow-y-auto p-3">
            <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9793aa]">Available destinations</p>
            {matches.length === 0 ? (
              <p role="status" className="px-3 py-10 text-center text-sm text-gray-500">No matching Attainline page.</p>
            ) : matches.map((command, index) => {
              const Icon = command.icon;
              return (
                <button
                  id={`command-${command.href}`}
                  key={command.href}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => select(command.href)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#600bea] ${activeIndex === index ? "bg-[linear-gradient(100deg,#f0f5ff,#f6efff)]" : "hover:bg-gray-50"}`}
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white text-[#600bea] shadow-[0_7px_22px_rgba(76,50,138,0.12)]"><Icon aria-hidden className="size-4" /></span>
                  <span className="min-w-0"><span className="block text-sm font-semibold text-[#23223c]">{command.label}</span><span className="mt-0.5 block text-xs text-[#858197]">{command.description}</span></span>
                  {command.href === pathname ? <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Current</span> : null}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-[#eeedf5] bg-[#fbfbfd] px-5 py-3 text-[10px] text-[#8d89a1]"><span>↑↓ Navigate · Enter Open</span><span>Esc Close</span></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
