// Recurring-weakness patterns across completed sessions (PRD §2.5).
// Surfaces the categories that come out weakest on average and how often they
// dipped below the passing bar, so users see what keeps tripping them up.

import { AlertTriangle } from "lucide-react";

import type { InsightKategori } from "@/lib/sessions";
import { getDictionary } from "@/i18n/server";

export async function RecurringWeakness({
  kategori,
  totalSesi,
}: {
  kategori: InsightKategori[];
  totalSesi: number;
}) {
  const { insights: t } = await getDictionary();
  // Show only categories that were actually weak in more than one session.
  const berulang = kategori.filter((k) => k.sesi_lemah >= 2).slice(0, 4);
  if (berulang.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} strokeWidth={1.5} className="text-critique-rust" />
        <h2 className="font-display text-xl font-semibold text-ink-navy">
          {t.title}
        </h2>
      </div>
      <p className="mt-2 text-sm text-ink-gray">
        {t.subtitleA} {totalSesi} {t.subtitleB}
      </p>

      <ul className="mt-4 divide-y divide-paper-line border-y border-paper-line">
        {berulang.map((k) => (
          <li
            key={k.nama}
            className="flex items-center justify-between gap-4 py-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-ink-navy">{k.nama}</p>
              <p className="font-mono text-[11px] text-critique-rust">
                {t.weakInA} {k.sesi_lemah} {t.weakInB} {k.total_sesi} {t.weakInC}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="h-2 w-24 bg-paper-line">
                <div
                  className="h-2 bg-critique-rust"
                  style={{ width: `${Math.max(0, Math.min(100, k.rata))}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-sm text-ink-navy tabular-nums">
                {k.rata}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
