"use client";

import { useState } from "react";
import { Lightbulb, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/client";

type Item = {
  urutan: number;
  pertanyaan: string;
  jawaban: string | null;
  koreksi: string;
  jawaban_lebih_baik: string;
};

export function AnswerSuggestions({ sessionId }: { sessionId: string }) {
  const toast = useToast();
  const { dict } = useI18n();
  const t = dict.suggestions;
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);

  async function muat() {
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/suggestions`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? t.loadFailed);
      setItems(data.items ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : dict.common.error, "error");
    } finally {
      setBusy(false);
    }
  }

  // Hidden from the printed/exported report on purpose.
  return (
    <section className="mt-10 border-t border-paper-line pt-8 print:hidden">
      <div className="flex items-center gap-2">
        <Lightbulb size={18} strokeWidth={1.5} className="text-spotlight-amber" />
        <h2 className="font-display text-lg font-semibold text-ink-navy">
          {t.title}
        </h2>
      </div>
      <p className="mt-2 max-w-xl text-sm text-ink-gray">{t.intro}</p>

      {items === null ? (
        <button
          onClick={muat}
          disabled={busy}
          className="mt-5 inline-flex items-center gap-2 border border-ink-navy/25 px-4 py-2.5 text-sm text-ink-navy transition-colors hover:border-ink-navy/60 disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              {t.loading}
            </>
          ) : (
            t.show
          )}
        </button>
      ) : items.length === 0 ? (
        <p className="mt-5 text-sm text-ink-gray">{t.empty}</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-5">
          {items.map((it) => (
            <li key={it.urutan} className="border border-paper-line bg-paper-soft p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
                {t.question} {it.urutan}
              </p>
              <p className="mt-1 text-sm font-medium text-ink-navy">
                {it.pertanyaan}
              </p>

              {it.jawaban && (
                <p className="mt-3 border-l-2 border-ink-gray/40 pl-3 text-sm text-ink-gray">
                  {t.yourAnswer} {it.jawaban}
                </p>
              )}
              {it.koreksi && (
                <p className="mt-3 border-l-2 border-critique-rust pl-3 text-sm text-ink-navy">
                  <span className="font-medium text-critique-rust">{t.correction} </span>
                  {it.koreksi}
                </p>
              )}
              <p className="mt-3 border-l-2 border-growth-teal bg-growth-teal/5 p-3 text-sm text-ink-navy">
                <span className="font-medium text-growth-teal">
                  {t.better}{" "}
                </span>
                {it.jawaban_lebih_baik}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
