"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";

import { isActive, NAV_ITEMS } from "@/components/dashboard/nav";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/client";

export function MobileNav({ nama }: { nama: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-40 md:hidden">
      <div className="flex items-center justify-between border-b border-navy-line bg-ink-navy px-4 py-3 text-warm-paper">
        <Logo tone="paper" />
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={dict.common.menu}
          className="text-warm-paper/70 transition-colors hover:text-warm-paper"
        >
          {open ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
        </button>
      </div>

      {open && (
        <nav className="border-b border-navy-line bg-ink-navy px-2 pb-4 text-warm-paper">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 text-sm transition-colors ${
                  active
                    ? "border-l-2 border-spotlight-amber bg-navy-soft"
                    : "border-l-2 border-transparent text-warm-paper/70"
                }`}
              >
                <item.icon size={20} strokeWidth={1.5} />
                {dict.nav[item.key]}
              </Link>
            );
          })}
          <div className="mt-2 border-t border-navy-line px-3 pt-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-warm-paper/40">
              {nama}
            </p>
            <button
              onClick={() => {
                setOpen(false);
                setConfirmLogout(true);
              }}
              className="mt-2 flex items-center gap-3 py-2 text-sm text-warm-paper/70 transition-colors hover:text-critique-rust"
            >
              <LogOut size={20} strokeWidth={1.5} />
              {dict.account.logout}
            </button>
          </div>
        </nav>
      )}

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
    </div>
  );
}
