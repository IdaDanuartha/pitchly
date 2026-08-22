"use client";

import { useState } from "react";
import { ExternalLink, Loader2, ScanSearch } from "lucide-react";

import { useI18n } from "@/i18n/client";

type Match = {
  nama: string;
  deskripsi: string;
  skor_kemiripan: number;
  url?: string | null;
  sumber?: string;
};

export function OriginalityCheck({ documentId }: { documentId: string }) {
  const { dict } = useI18n();
  const t = dict.originality;
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);
  const [available, setAvailable] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [sumber, setSumber] = useState<string>("korpus");
  const [webError, setWebError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function periksa() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/originality`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? t.checkFailed);
      setAvailable(data.available);
      setMatches(data.matches ?? []);
      setSumber(data.sumber ?? "korpus");
      setWebError(data.web_error ?? null);
      setRan(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 border-t border-paper-line pt-8">
      <div className="flex items-center gap-2">
        <ScanSearch size={20} strokeWidth={1.5} className="text-ink-navy" />
        <h2 className="font-display text-lg font-semibold text-ink-navy">
          {t.title}
        </h2>
      </div>
      <p className="mt-2 max-w-xl text-sm text-ink-gray">{t.intro}</p>

      {error && <p className="mt-4 text-sm text-critique-rust">{error}</p>}

      {ran && webError && (
        <p className="mt-4 border-l-2 border-spotlight-amber bg-spotlight-amber/10 px-3 py-2 font-mono text-xs text-ink-navy">
          {t.webFailed} {webError}
        </p>
      )}

      {!ran && (
        <button
          onClick={periksa}
          disabled={busy}
          className="mt-5 inline-flex items-center gap-2 border border-ink-navy/25 px-4 py-2.5 text-sm text-ink-navy transition-colors hover:border-ink-navy/60 disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              {t.scanning}
            </>
          ) : (
            t.checkButton
          )}
        </button>
      )}

      {ran && !available && (
        <p className="mt-5 border border-paper-line bg-paper-soft p-5 text-sm text-ink-gray">
          {t.notAvailable}
        </p>
      )}

      {ran && available && matches.length === 0 && (
        <p className="mt-5 border-l-2 border-growth-teal bg-growth-teal/5 p-5 text-sm text-ink-navy">
          {t.noMatches}
        </p>
      )}

      {ran && available && matches.length > 0 && (
        <>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
            {sumber === "web" ? t.sourceWeb : t.sourceInternal}
          </p>
          <ul className="mt-3 flex flex-col gap-4">
            {matches.map((m, i) => (
              <li key={i} className="border border-paper-line bg-paper-soft p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium text-ink-navy">{m.nama}</span>
                  <span className="font-mono text-sm text-critique-rust tabular-nums">
                    {m.skor_kemiripan}% {t.similar}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-paper-line">
                  <div
                    className="h-1.5 bg-critique-rust"
                    style={{ width: `${Math.max(0, Math.min(100, m.skor_kemiripan))}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-ink-gray">{m.deskripsi}</p>
                {m.url && (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-spotlight-amber hover:underline"
                  >
                    <ExternalLink size={13} strokeWidth={1.5} />
                    {t.viewSource}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
