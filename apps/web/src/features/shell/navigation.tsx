"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { navigationItems } from "./navigation-items";
import { Sidebar, SidebarRail } from "./sidebar/sidebar";
import { useSidebar } from "./sidebar/sidebar-context";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./sidebar/sidebar-menu";

type NavigationProps = {
  account: ReactNode;
};

const collapsibleTextClass =
  "whitespace-nowrap transition-[opacity,translate,scale] delay-200 duration-500 ease-out group-data-[collapsible=icon]:-translate-x-3 group-data-[collapsible=icon]:scale-95 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:delay-0 motion-reduce:transition-none";

export function Navigation({ account }: NavigationProps) {
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const isCollapsed = state === "collapsed" && !isMobile;

  function handleLinkClick() {
    if (isMobile) {
      setOpenMobile(false);
    } else if (state === "collapsed") {
      setOpen(true);
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className={twMerge("mb-0 py-2", isCollapsed ? "px-0" : "px-1")}>
          {isCollapsed ? (
            <SidebarGroupLabel className="mt-0! mb-4 flex items-center justify-center overflow-visible px-0 opacity-100!">
              <div className="relative flex h-[17px] w-8 items-center justify-center">
                <Image
                  src="/images/branding/collapsed-logo.svg"
                  alt="Attainline"
                  width={32}
                  height={17}
                  className="absolute inset-0 m-auto block"
                  priority
                />
              </div>
            </SidebarGroupLabel>
          ) : (
            <SidebarGroupLabel className="mb-6 flex items-center justify-between px-0">
              <span className="flex items-center gap-2">
                <Image
                  src="/images/branding/collapsed-logo.svg"
                  alt=""
                  width={22}
                  height={18}
                />
                <span className="text-sm font-semibold text-foreground">
                  Attainline
                </span>
              </span>
            </SidebarGroupLabel>
          )}

          <div className="flex flex-col gap-2">{account}</div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <nav aria-label="Main">
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link
                      href={item.href}
                      aria-current={pathname === item.href ? "page" : undefined}
                      onClick={handleLinkClick}
                    >
                      <item.icon aria-hidden className="h-4 w-4" />
                      <span className={collapsibleTextClass}>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
