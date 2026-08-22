import {
  ClipboardList,
  FileSearch,
  Gavel,
  ScanSearch,
  SlidersHorizontal,
  Timer,
  Users,
} from "lucide-react";

import { getDictionary } from "@/i18n/server";

const icons = [
  FileSearch,
  Gavel,
  SlidersHorizontal,
  Timer,
  Users,
  ScanSearch,
  ClipboardList,
];

export async function Features() {
  const dict = await getDictionary();
  const t = dict.landing.fitur;
  return (
    <section id="fitur" className="border-b border-paper-line bg-paper-soft">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
          {t.eyebrow}
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink-navy sm:text-4xl">
          {t.title}
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden border border-paper-line bg-paper-line md:grid-cols-2 lg:grid-cols-3">
          {t.items.map((f, i) => {
            const Icon = icons[i];
            // Last card fills the remaining cells so no empty grid space shows.
            const isLast = i === t.items.length - 1;
            const span = isLast ? "md:col-span-2 lg:col-span-3" : "";
            return (
              <div key={f.judul} className={`bg-warm-paper p-7 ${span}`}>
                <Icon size={24} strokeWidth={1.5} className="text-ink-navy" />
                <h3 className="mt-5 font-display text-lg font-semibold text-ink-navy">
                  {f.judul}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-gray">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
