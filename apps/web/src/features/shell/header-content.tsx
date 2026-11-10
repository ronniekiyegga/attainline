"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { navigationItems } from "./navigation-items";
import { SidebarTrigger } from "./sidebar/sidebar";
import { CommandPanel } from "./command-panel";

function Breadcrumb() {
  const pathname = usePathname();
  const pageTitle = navigationItems.find((item) => item.href === pathname)?.title;

  return pageTitle ? (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground sm:gap-2.5">
        <li className="inline-flex items-center gap-1.5">
          <span className="font-normal text-gray-500">Home</span>
          <ChevronRight aria-hidden className="size-3 text-gray-400" />
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-current="page" className="font-normal text-foreground">
            {pageTitle}
          </span>
        </li>
      </ol>
    </nav>
  ) : null;
}

export function HeaderContent() {
  return (
    <header className="mb-2 flex h-16 shrink-0 items-center justify-between gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 lg:pr-4">
      <div className="mt-0 flex items-center gap-2 px-6 lg:px-6">
        <SidebarTrigger />
        <div aria-hidden className="mr-1 h-4 w-px shrink-0 bg-gray-200" />
        <Suspense>
          <Breadcrumb />
        </Suspense>
      </div>
      <div className="hidden items-center gap-3 pr-3 text-gray-500 md:flex">
        <Suspense fallback={<div aria-hidden className="h-8 w-44 rounded-md border border-gray-100 bg-white shadow-sm" />}>
          <CommandPanel />
        </Suspense>
        <span className="h-5 w-px bg-gray-100" aria-hidden />
        <Link href="/dashboard#notifications" aria-label="Open notifications" className="relative flex size-7 items-center justify-center rounded-full hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#600bea]">
          <Bell aria-hidden className="size-4" />
        </Link>
      </div>
    </header>
  );
}
