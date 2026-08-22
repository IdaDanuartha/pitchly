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
  { href: "/dashboard/sesi-baru", key: "sesiBaru", icon: Plus },
  { href: "/dashboard/riwayat", key: "riwayat", icon: FileText },
  { href: "/dashboard/tim", key: "tim", icon: Users },
  { href: "/dashboard/rubrik", key: "rubrik", icon: LibraryBig },
  { href: "/dashboard/langganan", key: "langganan", icon: CreditCard },
  { href: "/dashboard/pengaturan", key: "pengaturan", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard"
    ? pathname === href
    : pathname.startsWith(href);
}
