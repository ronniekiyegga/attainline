import { ChartNoAxesCombined, LayoutDashboard, Trophy, Users, type LucideIcon } from "lucide-react";

type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const navigationItems: NavigationItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Analytics", href: "/analytics", icon: ChartNoAxesCombined },
  { title: "Rankings", href: "/rankings", icon: Trophy },
  { title: "Students", href: "/", icon: Users },
];
