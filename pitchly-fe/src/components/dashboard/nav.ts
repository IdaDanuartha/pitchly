import {
  CreditCard,
  FileText,
  LayoutDashboard,
  LibraryBig,
  Plus,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Dictionary } from "@/i18n/dictionaries/id";

type NavKey = keyof Dictionary["nav"];

export type NavItem = { href: string; key: NavKey; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", key: "beranda", icon: LayoutDashboard },
  { href: "/dashboard/new-session", key: "sesiBaru", icon: Plus },
  { href: "/dashboard/history", key: "riwayat", icon: FileText },
  { href: "/dashboard/team", key: "tim", icon: Users },
  { href: "/dashboard/rubrics", key: "rubrik", icon: LibraryBig },
  { href: "/dashboard/subscription", key: "langganan", icon: CreditCard },
  { href: "/dashboard/settings", key: "pengaturan", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard"
    ? pathname === href
    : pathname.startsWith(href);
}
