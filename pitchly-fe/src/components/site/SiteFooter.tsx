import Link from "next/link";

import { Logo } from "@/components/ui/Logo";
import { getDictionary } from "@/i18n/server";

export async function SiteFooter() {
  const dict = await getDictionary();
  const t = dict.landing.footer;
  return (
    <footer className="bg-ink-navy text-warm-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-14 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <Logo tone="paper" />
          <p className="mt-4 text-sm leading-relaxed text-warm-paper/60">
            {t.tagline}
          </p>
        </div>
        <nav className="flex gap-12 text-sm">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-warm-paper/40">
              {t.product}
            </span>
            <Link href="#fitur" className="text-warm-paper/75 hover:text-warm-paper">
              {t.fitur}
            </Link>
            <Link href="#cara-kerja" className="text-warm-paper/75 hover:text-warm-paper">
              {t.caraKerja}
            </Link>
            <Link href="#panel-juri" className="text-warm-paper/75 hover:text-warm-paper">
              {t.panelJuri}
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-warm-paper/40">
              {t.team}
            </span>
            <span className="text-warm-paper/75">ASTAGA REG</span>
            <span className="text-warm-paper/75">Universitas Primakara</span>
          </div>
        </nav>
      </div>
      <div className="border-t border-navy-line">
        <p className="mx-auto max-w-6xl px-6 py-5 font-mono text-[11px] uppercase tracking-[0.15em] text-warm-paper/40">
          BISA AI National AI Agent Challenge 2026
        </p>
      </div>
    </footer>
  );
}
