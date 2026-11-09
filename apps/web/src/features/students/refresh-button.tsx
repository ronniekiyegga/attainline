"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toolbarControlClass } from "./directory-link";

export function RefreshButton() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  return (
    <button
      type="button"
      className={toolbarControlClass}
      disabled={isRefreshing}
      aria-busy={isRefreshing}
      onClick={() => startRefresh(() => router.refresh())}
    >
      <RefreshCw
        className={`h-4 w-4 shrink-0 text-zinc-800 motion-reduce:animate-none ${isRefreshing ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      <span className="text-xs leading-none">
        {isRefreshing ? "Refreshing…" : "Refresh"}
      </span>
    </button>
  );
}
