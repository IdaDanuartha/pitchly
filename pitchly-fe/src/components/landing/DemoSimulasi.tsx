"use client";

import { useEffect, useState } from "react";
import { Gavel, Pause, Play, Rocket, RotateCcw, SearchX, Timer } from "lucide-react";

import { useI18n } from "@/i18n/client";

const ICONS = [Gavel, Rocket, SearchX];
const SCORE_VALUES = [62, 74, 55, 68] as const;

export function DemoSimulasi() {
  const { dict } = useI18n();
  const t = dict.landing.demo;
  const STEPS = t.steps;
  const SKOR = [
    [t.scoreLabels.teknis, SCORE_VALUES[0]],
    [t.scoreLabels.dampak, SCORE_VALUES[1]],
    [t.scoreLabels.orisinalitas, SCORE_VALUES[2]],
    [t.scoreLabels.penyampaian, SCORE_VALUES[3]],
  ] as const;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (step < STEPS.length - 1) setStep((s) => s + 1);
      else setShowScore(true);
    }, 4200);
    return () => clearTimeout(t);
  }, [step, playing]);

  function restart() {
    setStep(0);
    setShowScore(false);
    setPlaying(true);
  }

  const s = STEPS[step];

  return (
    <section id="demo" className="border-b border-paper-line bg-paper-soft">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
          {t.eyebrow}
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink-navy sm:text-4xl">
          {t.title}
        </h2>
        <p className="mt-3 max-w-xl text-ink-gray">{t.subtitle}</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Stage */}
          <div className="border border-navy-line bg-ink-navy p-6 text-warm-paper">
            <div className="flex items-center justify-between border-b border-navy-line pb-4">
              <div className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.15em]">
                {STEPS.map((st, i) => {
                  const Icon = ICONS[i];
                  return (
                  <span
                    key={st.label}
                    className={`inline-flex items-center gap-1 border px-2 py-1 ${
                      i === step && !showScore
                        ? "border-spotlight-amber text-spotlight-amber"
                        : "border-navy-line text-warm-paper/40"
                    }`}
                  >
                    <Icon size={12} strokeWidth={1.5} />
                    <span className="hidden sm:inline">{st.label}</span>
                  </span>
                  );
                })}
              </div>
              <span className="inline-flex items-center gap-1.5 font-mono text-sm text-spotlight-amber">
                <Timer size={14} strokeWidth={1.5} />
                0{step + 1}:{showScore ? "58" : "12"}
              </span>
            </div>

            {!showScore ? (
              <div key={step} className="animate-[fadeIn_0.4s_ease]">
                <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-spotlight-amber">
                  {s.label} · {t.turn} {step + 1}/{STEPS.length}
                </p>
                <p className="mt-3 font-display text-xl leading-snug font-semibold sm:text-2xl">
                  {s.pertanyaan}
                </p>
                <div className="mt-5 border border-navy-line bg-navy-soft p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-warm-paper/50">
                    {t.participantAnswer}
                  </p>
                  <p className="mt-1.5 text-sm text-warm-paper/85">{s.jawaban}</p>
                </div>
                <p className="mt-4 border-l-2 border-critique-rust pl-3 text-sm text-warm-paper/70">
                  {s.catatan}
                </p>
              </div>
            ) : (
              <div className="animate-[fadeIn_0.4s_ease]">
                <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-warm-paper/50">
                  {t.sessionDone}
                </p>
                <p className="mt-3 font-display text-2xl font-semibold">
                  {t.scorecardReady}
                </p>
                <p className="mt-2 text-sm text-warm-paper/70">
                  {t.scorecardReadyBody}
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3 border-t border-navy-line pt-4">
              <button
                onClick={() => setPlaying((p) => !p)}
                className="inline-flex items-center gap-2 border border-navy-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-warm-paper/70 transition-colors hover:text-warm-paper"
              >
                {playing ? (
                  <Pause size={14} strokeWidth={1.5} />
                ) : (
                  <Play size={14} strokeWidth={1.5} />
                )}
                {playing ? t.pause : t.play}
              </button>
              <button
                onClick={restart}
                className="inline-flex items-center gap-2 border border-navy-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-warm-paper/70 transition-colors hover:text-warm-paper"
              >
                <RotateCcw size={14} strokeWidth={1.5} />
                {t.restart}
              </button>
              <div className="ml-auto flex gap-1">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 w-6 ${
                      (showScore ? STEPS.length : step) > i
                        ? "bg-spotlight-amber"
                        : "bg-navy-line"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Scorecard preview */}
          <div className="border border-paper-line bg-warm-paper p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
              {t.scorecardPreview}
            </p>
            <div
              className={`mt-4 flex flex-col gap-4 transition-opacity duration-500 ${
                showScore ? "opacity-100" : "opacity-30"
              }`}
            >
              {SKOR.map(([nama, skor]) => (
                <div key={nama}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-ink-navy">{nama}</span>
                    <span className="font-mono text-sm text-ink-gray tabular-nums">
                      {showScore ? skor : "—"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full bg-paper-line">
                    <div
                      className="h-2 bg-spotlight-amber transition-all duration-700"
                      style={{ width: showScore ? `${skor}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-paper-line pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-growth-teal">
                {t.kekuatan}
              </p>
              <p className="mt-1 text-sm text-ink-navy">{t.kekuatanBody}</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-critique-rust">
                {t.kelemahan}
              </p>
              <p className="mt-1 text-sm text-ink-navy">{t.kelemahanBody}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
