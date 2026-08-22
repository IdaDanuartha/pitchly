import { Circle, Timer } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { getDictionary } from "@/i18n/server";
import type { Dictionary } from "@/i18n/dictionaries/id";

export async function Hero() {
  const dict = await getDictionary();
  const t = dict.landing.hero;
  return (
    <section className="relative overflow-hidden border-b border-paper-line">
      <div className="mx-auto grid max-w-6xl gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div className="flex flex-col justify-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
            {t.eyebrow}
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink-navy sm:text-6xl">
            {t.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-gray">
            {t.subtitle}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/daftar" variant="primary">
              {t.ctaPrimary}
            </ButtonLink>
            <ButtonLink href="#demo" variant="secondary">
              {t.ctaSecondary}
            </ButtonLink>
          </div>
        </div>

        <HeroStageMock t={t} />
      </div>
    </section>
  );
}

/** Mock antarmuka simulasi (mode gelap Ink Navy) — pengganti tangkapan layar. */
function HeroStageMock({ t }: { t: Dictionary["landing"]["hero"] }) {
  return (
    <div className="relative flex items-center">
      <div className="w-full border border-navy-line bg-ink-navy p-6 text-warm-paper shadow-[0_24px_60px_-30px_rgba(14,20,32,0.7)]">
        <div className="flex items-center justify-between border-b border-navy-line pb-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-warm-paper/60">
            {t.mockLive}
          </span>
          <span className="inline-flex items-center gap-2 font-mono text-sm text-spotlight-amber">
            <Timer size={16} strokeWidth={1.5} /> 04:12
          </span>
        </div>

        <div className="mt-5 flex gap-2 font-mono text-[11px] uppercase tracking-[0.15em]">
          <PersonaTab label="Teknis" active />
          <PersonaTab label="Dampak" />
          <PersonaTab label="Skeptis" />
        </div>

        <p className="mt-6 text-sm leading-relaxed text-warm-paper/85">
          <span className="text-spotlight-amber">{t.mockJudgeTeknis}</span>{" "}
          {t.mockQuestion}
        </p>

        <div className="mt-6 border border-navy-line bg-navy-soft p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-warm-paper/50">
            {t.mockYourAnswer}
          </p>
          <div className="mt-2 flex items-center gap-2 text-warm-paper/40">
            <Circle size={8} className="animate-pulse" fill="currentColor" />
            <span className="text-sm">{t.mockRecording}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonaTab({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={
        active
          ? "border border-spotlight-amber px-3 py-1.5 text-spotlight-amber"
          : "border border-navy-line px-3 py-1.5 text-warm-paper/45"
      }
    >
      {label}
    </span>
  );
}
