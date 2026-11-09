"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function MetricInfo({ title, description }: { title: string; description: string }) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, placement: "above" as "above" | "below" });

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const bounds = buttonRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setPosition({
        left: Math.min(Math.max(16, bounds.left), Math.max(16, window.innerWidth - 272)),
        top: bounds.top >= 96 ? bounds.top - 6 : bounds.bottom + 6,
        placement: bounds.top >= 96 ? "above" : "below",
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`More information: ${title}`}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-neutral-900 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#600bea]/40"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="8" r="1" fill="currentColor" />
        </svg>
      </button>
      {open ? createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none fixed z-[200] w-64 max-w-[calc(100vw-2rem)] rounded-md border border-gray-100 bg-white px-3 py-2.5 text-left text-[11px] font-medium leading-snug text-gray-800 shadow-[0px_8px_24px_0_rgba(15,23,42,0.12)] ${position.placement === "above" ? "-translate-y-full" : ""}`}
          style={{ left: position.left, top: position.top }}
        >
          {description}
        </span>,
        document.body,
      ) : null}
    </span>
  );
}
