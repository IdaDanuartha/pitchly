import { getDictionary } from "@/i18n/server";
import { ScrollReveal } from "./ScrollReveal";

export async function HowItWorks() {
  const dict = await getDictionary();
  const t = dict.landing.caraKerja;
  return (
    <section id="cara-kerja" className="border-b border-paper-line">
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
          staggerDelay={0.15}
          className="mt-12 divide-y divide-paper-line border-y border-paper-line"
        >
          {t.steps.map((l, i) => (
            <li
              key={l.judul}
              className="grid gap-4 py-8 sm:grid-cols-[auto_1fr] sm:gap-10 list-none"
            >
              <span className="font-display text-5xl font-semibold leading-none text-spotlight-amber tabular-nums sm:text-6xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="max-w-2xl">
                <h3 className="font-display text-xl font-semibold text-ink-navy">
                  {l.judul}
                </h3>
                <p className="mt-2 text-ink-gray">{l.body}</p>
              </div>
            </li>
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}
