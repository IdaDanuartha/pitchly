"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckSquare, Loader2, MonitorPlay, Printer, RotateCcw, Square, Trash2, TrendingUp, Wrench } from "lucide-react";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/client";

type Pacing = {
  wpm_rata: number;
  total_filler: number;
  jumlah_jawaban: number;
  tempo: string;
  catatan: string[];
};

type PenilaianPresentasi = {
  skor?: number;
  ringkasan?: string;
  kekuatan?: string[];
  perbaikan?: string[];
};

type Scorecard = {
  skor_per_kategori_json: Record<string, number>;
  skor_akhir: number | null;
  ringkasan_kekuatan: string;
  ringkasan_kelemahan: string;
  rencana_perbaikan_json: string[];
  pacing_json: Pacing | null;
  penilaian_presentasi_json: PenilaianPresentasi | null;
  model_used: string;
};

export function ScorecardView({
  scorecard,
  documentId,
  sessionId,
}: {
  scorecard: Scorecard;
  documentId: string | null;
  sessionId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { locale, dict } = useI18n();
  const t = dict.scorecard;
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [restarting, setRestarting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const kategori = Object.entries(scorecard.skor_per_kategori_json);
  const rataRata =
    scorecard.skor_akhir ??
    (kategori.length
      ? Math.round(kategori.reduce((s, [, v]) => s + v, 0) / kategori.length)
      : 0);

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function latihanUlang() {
    if (!documentId) return;
    setRestarting(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId, output_language: locale }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/session/${data.id}`);
    else setRestarting(false);
  }

  async function handleHapusSesi() {
    if (!sessionId) return;
    setDeleting(true);
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast(t.deleted, "success");
      router.push("/dashboard/history");
    } else {
      toast(t.deleteFailed, "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
            {t.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-navy">
            {t.heading}
          </h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-5xl font-medium text-ink-navy tabular-nums">
            {rataRata}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
            {scorecard.skor_akhir != null ? t.scoreFinal : t.scoreAvg}
          </p>
        </div>
      </div>

      {/* Skor per kategori — bar horizontal sederhana */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink-navy">
          {t.perCategory}
        </h2>
        <div className="mt-5 flex flex-col gap-4">
          {kategori.map(([nama, skor]) => (
            <div key={nama}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-navy">{nama}</span>
                <span className="font-mono text-sm text-ink-gray tabular-nums">
                  {skor}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full bg-paper-line">
                <div
                  className="h-2 bg-spotlight-amber"
                  style={{ width: `${Math.max(0, Math.min(100, skor))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Kekuatan & kelemahan */}
      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="border-l-2 border-growth-teal bg-growth-teal/5 p-5">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-growth-teal">
            {t.kekuatan}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-navy">
            {scorecard.ringkasan_kekuatan}
          </p>
        </div>
        <div className="border-l-2 border-critique-rust bg-critique-rust/5 p-5">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-critique-rust">
            {t.kelemahan}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-navy">
            {scorecard.ringkasan_kelemahan}
          </p>
        </div>
      </section>

      {/* Penilaian presentasi */}
      {scorecard.penilaian_presentasi_json && (
        <section className="mt-10">
          {/* Header card */}
          <div className="border border-paper-line bg-paper-soft px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <MonitorPlay size={18} strokeWidth={1.5} className="shrink-0 text-spotlight-amber" />
                <h2 className="font-display text-lg font-semibold text-ink-navy">
                  {t.penilaianPresentasi}
                </h2>
              </div>
              {typeof scorecard.penilaian_presentasi_json.skor === "number" && (
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-semibold tabular-nums text-ink-navy">
                    {scorecard.penilaian_presentasi_json.skor}
                  </span>
                  <span className="font-mono text-sm text-ink-gray">/100</span>
                </div>
              )}
            </div>
            {scorecard.penilaian_presentasi_json.ringkasan && (
              <p className="mt-3 border-t border-paper-line pt-3 text-sm leading-relaxed text-ink-gray">
                {scorecard.penilaian_presentasi_json.ringkasan}
              </p>
            )}
          </div>

          {/* Kekuatan & Perbaikan columns */}
          <div className="mt-px grid sm:grid-cols-2">
            {!!scorecard.penilaian_presentasi_json.kekuatan?.length && (
              <div className="border border-r-0 border-paper-line p-5 sm:border-r-0">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} strokeWidth={1.5} className="shrink-0 text-growth-teal" />
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-growth-teal">
                    {t.kekuatan}
                  </h3>
                </div>
                <ul className="mt-4 flex flex-col gap-3">
                  {scorecard.penilaian_presentasi_json.kekuatan.map((x, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 shrink-0 text-growth-teal" aria-hidden>✦</span>
                      <span className="text-sm leading-relaxed text-ink-navy">{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!scorecard.penilaian_presentasi_json.perbaikan?.length && (
              <div className="border border-paper-line p-5">
                <div className="flex items-center gap-2">
                  <Wrench size={14} strokeWidth={1.5} className="shrink-0 text-critique-rust" />
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-critique-rust">
                    {t.perbaikan}
                  </h3>
                </div>
                <ul className="mt-4 flex flex-col gap-3">
                  {scorecard.penilaian_presentasi_json.perbaikan.map((x, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 shrink-0 text-critique-rust" aria-hidden>→</span>
                      <span className="text-sm leading-relaxed text-ink-navy">{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Pacing & penyampaian */}
      {scorecard.pacing_json && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-ink-navy">
            {t.pacingTitle}
          </h2>
          <div className="mt-4 grid gap-px overflow-hidden border border-paper-line bg-paper-line sm:grid-cols-3">
            <PacingStat
              label={t.pacingTempo}
              value={`${scorecard.pacing_json.wpm_rata} wpm`}
              hint={scorecard.pacing_json.tempo}
            />
            <PacingStat
              label={t.pacingFiller}
              value={String(scorecard.pacing_json.total_filler)}
              hint={`${t.pacingFromAnswers} ${scorecard.pacing_json.jumlah_jawaban} ${t.pacingAnswers}`}
            />
            <PacingStat
              label={t.pacingRecorded}
              value={String(scorecard.pacing_json.jumlah_jawaban)}
              hint={t.pacingVoiceMode}
            />
          </div>
          {scorecard.pacing_json.catatan.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {scorecard.pacing_json.catatan.map((c, i) => (
                <li key={i} className="text-sm text-ink-gray">
                  — {c}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Rencana perbaikan */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink-navy">
          {t.rencanaPerbaikan}
        </h2>
        <ul className="mt-4 divide-y divide-paper-line border-y border-paper-line">
          {scorecard.rencana_perbaikan_json.map((item, i) => (
            <li key={i}>
              <button
                onClick={() => toggle(i)}
                className="flex w-full items-start gap-3 py-3.5 text-left"
              >
                {checked.has(i) ? (
                  <CheckSquare
                    size={20}
                    strokeWidth={1.5}
                    className="mt-0.5 shrink-0 text-growth-teal"
                  />
                ) : (
                  <Square
                    size={20}
                    strokeWidth={1.5}
                    className="mt-0.5 shrink-0 text-ink-gray"
                  />
                )}
                <span
                  className={`text-sm ${
                    checked.has(i)
                      ? "text-ink-gray line-through"
                      : "text-ink-navy"
                  }`}
                >
                  {item}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-paper-line pt-8 print:hidden">
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
          {t.model}: {scorecard.model_used}
        </span>
        <div className="flex flex-wrap gap-3">
          {sessionId && (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="inline-flex items-center gap-2 border border-critique-rust/40 px-4 py-2.5 text-sm text-critique-rust transition-colors hover:border-critique-rust hover:bg-critique-rust/5 disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <Trash2 size={16} strokeWidth={1.5} />
              )}
              {t.hapusSesi}
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-ink-navy/25 px-4 py-2.5 text-sm text-ink-navy transition-colors hover:border-ink-navy/60"
          >
            <Printer size={16} strokeWidth={1.5} />
            {t.cetak}
          </button>
          {documentId && (
            <button
              onClick={latihanUlang}
              disabled={restarting}
              className="inline-flex items-center gap-2 border border-spotlight-amber bg-spotlight-amber px-4 py-2.5 text-sm font-medium text-warm-paper transition-colors hover:bg-[#a06a15] disabled:opacity-60"
            >
              {restarting ? (
                <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <RotateCcw size={16} strokeWidth={1.5} />
              )}
              {t.latihanUlang}
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title={t.confirmTitle}
        message={t.confirmMessage}
        confirmLabel={t.confirmLabel}
        tone="danger"
        loading={deleting}
        onConfirm={handleHapusSesi}
        onCancel={() => !deleting && setConfirmDelete(false)}
      />
    </div>
  );
}

function PacingStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-warm-paper p-5">
      <p className="font-mono text-2xl font-medium text-ink-navy tabular-nums">
        {value}
      </p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
        {label}
      </p>
      <p className="mt-0.5 text-xs text-ink-gray">{hint}</p>
    </div>
  );
}
