"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Bell, ChevronRight, CloudUpload, Search } from "lucide-react";
import { navigationItems } from "./navigation-items";
import { SidebarTrigger } from "./sidebar/sidebar";

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
        <div className="flex h-8 w-44 items-center gap-2 rounded-md border border-gray-100 bg-white px-2 text-xs text-gray-400 shadow-sm" aria-label="Search is unavailable in the public demonstration">
          <Search aria-hidden className="size-4" />
          <span>Search...</span>
          <span className="ml-auto text-[10px]">⌘ K</span>
        </div>
        <span className="h-5 w-px bg-gray-100" aria-hidden />
        <span title="Notifications are unavailable in the public demonstration" className="relative flex size-7 items-center justify-center">
          <Bell aria-hidden className="size-4" />
        </span>
        <span title="Uploads are unavailable in the public demonstration" className="flex size-7 items-center justify-center">
          <CloudUpload aria-hidden className="size-4" />
        </span>
      </div>
    </header>
  );
}
