import { AlarmClock, MessageCircleQuestion, Users } from "lucide-react";

import { getDictionary } from "@/i18n/server";
import { ScrollReveal } from "./ScrollReveal";

const icons = [MessageCircleQuestion, Users, AlarmClock];

export async function Problems() {
  const dict = await getDictionary();
  const t = dict.landing.masalah;
  return (
    <section className="border-b border-paper-line bg-paper-soft">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <ScrollReveal variant="up">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
            {t.eyebrow}
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink-navy sm:text-4xl">
            {t.title}
          </h2>
        </ScrollReveal>
        <ScrollReveal
          variant="up"
          delay={0.1}
          stagger
          staggerDelay={0.12}
          className="mt-12 grid gap-px overflow-hidden border border-paper-line bg-paper-line sm:grid-cols-3"
        >
          {t.items.map((p, i) => {
            const Icon = icons[i];
            return (
              <div key={p.stat} className="bg-warm-paper p-7">
                <Icon size={24} strokeWidth={1.5} className="text-spotlight-amber" />
                <p className="mt-5 font-display text-xl font-semibold text-ink-navy">
                  {p.stat}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-gray">{p.body}</p>
              </div>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
