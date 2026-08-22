"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Target, XCircle } from "lucide-react";

import { useI18n } from "@/i18n/client";

type Analisis = {
  akurasi_persen: number;
  prediksi_tepat: string[];
  prediksi_terlewat: string[];
  ringkasan: string;
};

export type Outcome = {
  id: string;
  session_id: string;
  kritik_juri_asli: string;
  hasil: string;
  catatan: string | null;
  analisis_json: Analisis | null;
  model_used: string | null;
  created_at: string;
};

export function CompetitionOutcome({
  sessionId,
  initialOutcome,
  jenis = "kompetisi",
}: {
  sessionId: string;
  initialOutcome: Outcome | null;
  jenis?: "kompetisi" | "akademik";
}) {
  const { dict } = useI18n();
  const t = dict.outcome;
  const isAkademik = jenis === "akademik";

  const hasilOpsi = isAkademik
    ? [
        { value: "lulus", label: t.optLulus ?? "Lulus / Nilai Baik" },
        { value: "revisi_minor", label: t.optRevisiMinor ?? "Revisi Minor" },
        { value: "revisi_mayor", label: t.optRevisiMayor ?? "Revisi Mayor" },
        { value: "mengulang", label: t.optMengulang ?? "Belum Lolos / Mengulang" },
      ]
    : [
        { value: "menang", label: t.optMenang },
        { value: "finalis", label: t.optFinalis },
        { value: "lolos", label: t.optLolos },
        { value: "gugur", label: t.optGugur },
      ];

  const calibTitle = isAkademik
    ? (t.calibTitleAkademik ?? "Kalibrasi Pasca-Sidang / Ujian")
    : t.calibTitle;
  const calibIntro = isAkademik
    ? (t.calibIntroAkademik ?? "Membandingkan prediksi Pitchly dengan pertanyaan & kritik dosen penguji sesungguhnya.")
    : t.calibIntro;
  const ctaTitle = isAkademik
    ? (t.ctaTitleAkademik ?? "Sudah selesai sidang / ujiannya?")
    : t.ctaTitle;
  const ctaIntro = isAkademik
    ? (t.ctaIntroAkademik ?? "Catat hasil & kritik dosen penguji asli. Pitchly akan membandingkannya dengan prediksi latihan ini untuk mengukur seberapa akurat simulasinya.")
    : t.ctaIntro;
  const ctaButton = isAkademik
    ? (t.ctaButtonAkademik ?? "Catat Hasil Sidang / Ujian")
    : t.ctaButton;
  const formTitle = isAkademik
    ? (t.formTitleAkademik ?? "Catat Hasil Sidang / Ujian")
    : t.formTitle;
  const kritikLabel = isAkademik
    ? (t.kritikLabelAkademik ?? "Kritik / pertanyaan dosen penguji sesungguhnya")
    : t.kritikLabel;
  const kritikPlaceholder = isAkademik
    ? (t.kritikPlaceholderAkademik ?? "Tulis poin-poin yang ditanyakan atau dikritik dosen penguji asli…")
    : t.kritikPlaceholder;

  const [outcome, setOutcome] = useState<Outcome | null>(initialOutcome);
  const [open, setOpen] = useState(false);
  const [kritik, setKritik] = useState("");
  const [hasil, setHasil] = useState(isAkademik ? "lulus" : "finalis");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!kritik.trim()) {
      setError(t.fillCritiqueFirst);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kritik_juri_asli: kritik,
          hasil,
          catatan: catatan || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? t.saveFailed);
      setOutcome(data);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setSaving(false);
    }
  }

  // Already recorded → show the calibration result.
  if (outcome) {
    const a = outcome.analisis_json;
    return (
      <section className="mt-10 border-t border-paper-line pt-8">
        <div className="flex items-center gap-2">
          <Target size={18} strokeWidth={1.5} className="text-spotlight-amber" />
          <h2 className="font-display text-lg font-semibold text-ink-navy">
            {calibTitle}
          </h2>
        </div>
        <p className="mt-2 text-sm text-ink-gray">{calibIntro}</p>

        {a ? (
          <>
            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-spotlight-amber">
                <span className="font-mono text-lg font-medium text-ink-navy tabular-nums">
                  {a.akurasi_persen}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-ink-navy">{a.ringkasan}</p>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-growth-teal">
                  <CheckCircle2 size={14} strokeWidth={1.5} />
                  {t.prediksiTepat}
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {a.prediksi_tepat.length ? (
                    a.prediksi_tepat.map((x, i) => (
                      <li key={i} className="text-sm text-ink-navy">
                        — {x}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-ink-gray">—</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-critique-rust">
                  <XCircle size={14} strokeWidth={1.5} />
                  {t.terlewat}
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {a.prediksi_terlewat.length ? (
                    a.prediksi_terlewat.map((x, i) => (
                      <li key={i} className="text-sm text-ink-navy">
                        — {x}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-ink-gray">—</li>
                  )}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-gray">
            {t.analisisFailed}{" "}
            &ldquo;{outcome.kritik_juri_asli}&rdquo;
          </p>
        )}
      </section>
    );
  }

  // Not yet recorded → CTA + form.
  return (
    <section className="mt-10 border-t border-paper-line pt-8 print:hidden">
      {!open ? (
        <div className="flex flex-col items-start gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink-navy">
              {ctaTitle}
            </h2>
            <p className="mt-1 max-w-lg text-sm text-ink-gray">{ctaIntro}</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 border border-ink-navy/25 px-4 py-2.5 text-sm text-ink-navy transition-colors hover:border-ink-navy/60"
          >
            <Target size={16} strokeWidth={1.5} />
            {ctaButton}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold text-ink-navy">
            {formTitle}
          </h2>
          {error && <p className="text-sm text-critique-rust">{error}</p>}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
              {t.hasilLabel}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {hasilOpsi.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setHasil(o.value)}
                  className={`border px-3 py-1.5 text-sm transition-colors ${
                    hasil === o.value
                      ? "border-spotlight-amber bg-spotlight-amber/10 text-ink-navy"
                      : "border-paper-line text-ink-gray hover:border-ink-navy/40"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
              {kritikLabel}
            </label>
            <textarea
              value={kritik}
              onChange={(e) => setKritik(e.target.value)}
              rows={4}
              placeholder={kritikPlaceholder}
              className="mt-2 w-full border border-paper-line bg-warm-paper p-3 text-sm text-ink-navy outline-none focus:border-spotlight-amber"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
              {t.catatanLabel}
            </label>
            <input
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="mt-2 w-full border border-paper-line bg-warm-paper p-3 text-sm text-ink-navy outline-none focus:border-spotlight-amber"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center gap-2 border border-spotlight-amber bg-spotlight-amber px-4 py-2.5 text-sm font-medium text-warm-paper transition-colors hover:bg-[#a06a15] disabled:opacity-60"
            >
              {saving && (
                <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              )}
              {t.saveButton}
            </button>
            <button
              onClick={() => setOpen(false)}
              disabled={saving}
              className="px-4 py-2.5 text-sm text-ink-gray hover:text-ink-navy"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
