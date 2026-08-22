"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { isActive, NAV_ITEMS } from "@/components/dashboard/nav";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/client";

export function Sidebar({ nama }: { nama: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dict } = useI18n();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-navy-line bg-ink-navy px-4 py-6 text-warm-paper md:flex">
      <div className="px-2">
        <Logo tone="paper" />
      </div>

      <nav className="mt-10 flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "border-l-2 border-spotlight-amber bg-navy-soft text-warm-paper"
                  : "border-l-2 border-transparent text-warm-paper/60 hover:text-warm-paper"
              }`}
            >
              <item.icon size={20} strokeWidth={1.5} />
              {dict.nav[item.key]}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-navy-line pt-4">
        <p className="px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-warm-paper/40">
          {dict.account.signedInAs}
        </p>
        <p className="mt-1 truncate px-3 text-sm text-warm-paper/85">{nama}</p>
        <button
          onClick={() => setConfirmLogout(true)}
          className="mt-3 flex w-full items-center gap-3 px-3 py-2.5 text-sm text-warm-paper/60 transition-colors hover:text-critique-rust"
        >
          <LogOut size={20} strokeWidth={1.5} />
          {dict.account.logout}
        </button>
      </div>

      <ConfirmModal
        open={confirmLogout}
        title={dict.account.logoutTitle}
        message={dict.account.logoutMessage}
        confirmLabel={dict.account.logoutConfirm}
        tone="danger"
        loading={loggingOut}
        onConfirm={logout}
        onCancel={() => !loggingOut && setConfirmLogout(false)}
      />
    </aside>
  );
}
