import { Gavel, Rocket, SearchX } from "lucide-react";

import { getDictionary } from "@/i18n/server";
import { ScrollReveal } from "./ScrollReveal";

const icons = [Gavel, Rocket, SearchX];

export async function JudgePanel() {
  const dict = await getDictionary();
  const t = dict.landing.panel;
  return (
    <section id="panel-juri" className="border-b border-navy-line bg-ink-navy">
      <div className="mx-auto max-w-6xl px-6 py-20 text-warm-paper">
        <ScrollReveal variant="up">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-warm-paper/50">
            {t.eyebrow}
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.title}
          </h2>
        </ScrollReveal>

        <ScrollReveal
          variant="up"
          delay={0.1}
          stagger
          staggerDelay={0.12}
          className="mt-12 grid gap-6 md:grid-cols-3"
        >
          {t.items.map((j, i) => {
            const Icon = icons[i];
            return (
            <div
              key={j.nama}
              className="flex flex-col border border-navy-line bg-navy-soft p-7"
            >
              <Icon size={24} strokeWidth={1.5} className="text-spotlight-amber" />
              <h3 className="mt-5 font-display text-xl font-semibold">{j.nama}</h3>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-warm-paper/50">
                {j.fokus}
              </p>
              <p className="mt-5 text-sm leading-relaxed text-warm-paper/80">
                {j.contoh}
              </p>
            </div>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
