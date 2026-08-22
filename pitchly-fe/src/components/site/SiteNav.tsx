import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/i18n/server";

export async function SiteNav() {
  const user = await getCurrentUser();
  const dict = await getDictionary();
  const t = dict.landing.nav;
  const links = [
    { href: "#demo", label: t.demo },
    { href: "#fitur", label: t.fitur },
    { href: "#cara-kerja", label: t.caraKerja },
    { href: "#panel-juri", label: t.panelJuri },
    { href: "#harga", label: t.harga },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-paper-line bg-warm-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-ink-gray transition-colors hover:text-ink-navy"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <ButtonLink href="/dashboard" variant="primary">
              {t.toDashboard}
            </ButtonLink>
          ) : (
            <>
              <ButtonLink
                href="/login"
                variant="ghost"
                className="hidden sm:inline-flex"
              >
                {t.signIn}
              </ButtonLink>
              <ButtonLink href="/register" variant="primary">
                {t.startPractice}
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
