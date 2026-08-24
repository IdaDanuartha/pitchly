"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  MonitorUp,
  Radio,
  SkipForward,
  StopCircle,
  Timer,
} from "lucide-react";

import { useI18n } from "@/i18n/client";

type Phase = "idle" | "live" | "processing";

export function PresentationPhase({
  sessionId,
  durasiMenit,
  onDone,
}: {
  sessionId: string;
  durasiMenit: number;
  onDone: () => void;
}) {
  const { dict } = useI18n();
  const t = dict.presentation;
  const total = Math.max(1, durasiMenit) * 60;
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(total);
  const [error, setError] = useState<string | null>(null);
  // Screen share (getDisplayMedia) is desktop-only — mobile browsers lack it.
  const [screenShareSupported, setScreenShareSupported] = useState(true);

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finishedRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Floating timer (Picture-in-Picture) so the countdown stays visible while
  // another window/screen is shared.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Voice-activated start: the countdown only begins once the user speaks.
  const micCtxRef = useRef<AudioContext | null>(null);
  const vadRafRef = useRef<number | null>(null);
  const timerStartedRef = useRef(false);
  const [waitingVoice, setWaitingVoice] = useState(false);

  function drawTimer(sec: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const danger = sec <= 30;
    ctx.fillStyle = "#0f1729";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = danger ? "#c2603f" : "#c9871f";
    ctx.font = "600 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText(t.pipRemaining, canvas.width / 2, 42);
    ctx.font = "700 72px monospace";
    ctx.fillText(fmt(sec), canvas.width / 2, 118);
  }

  async function enterPip() {
    const canvas = canvasRef.current;
    const video = pipVideoRef.current;
    if (!canvas || !video) return;
    try {
      drawTimer(total);
      const stream = canvas.captureStream(1);
      video.srcObject = stream;
      await video.play().catch(() => {});
      if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
        await video.requestPictureInPicture();
      }
    } catch {
      /* PiP unsupported/blocked — the tab title still shows the countdown */
    }
  }

  function playAlarm() {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = audioCtxRef.current ?? new Ctx();
      audioCtxRef.current = ctx;
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = 880;
        const t = now + i * 0.35;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    } catch {
      /* audio unavailable */
    }
  }

  function startCountdown() {
    if (timerStartedRef.current) return;
    timerStartedRef.current = true;
    setWaitingVoice(false);
    if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current);
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (next <= 0) {
          drawTimer(0);
          document.title = t.timeUpTitle;
          playAlarm();
          finish();
          return 0;
        }
        drawTimer(next);
        document.title = `${fmt(next)} • ${t.presentasiTitle}`;
        return next;
      });
    }, 1000);
  }

  // Start the countdown on the first detected speech.
  function startVad(stream: MediaStream) {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      micCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const THRESHOLD = 0.05; // amplitude (0..1) that counts as speech
      const loop = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length / 255;
        if (avg > THRESHOLD) {
          startCountdown();
          return;
        }
        vadRafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      startCountdown(); // VAD unavailable → start immediately
    }
  }

  function stopStreams() {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (tickRef.current) clearInterval(tickRef.current);
    if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current);
    void micCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;
    if (typeof document !== "undefined") {
      document.title = "Pitchly";
      if (document.pictureInPictureElement) {
        void document.exitPictureInPicture().catch(() => {});
      }
    }
  }

  useEffect(() => stopStreams, []);

  // Detect whether this device can share a screen (desktop only). Mobile
  // browsers don't implement getDisplayMedia and can't share a tab/window.
  useEffect(() => {
    const hasApi =
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getDisplayMedia === "function";
    const coarsePointer =
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches;
    setScreenShareSupported(hasApi && !coarsePointer);
  }, []);

  async function submitTranscript(transkrip: string) {
    try {
      await fetch(`/api/sessions/${sessionId}/presentation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transkrip }),
      });
    } catch {
      /* even if this fails, move on to Q&A */
    }
    onDone();
  }

  // Called on time-up, manual stop, or when the user stops sharing.
  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (tickRef.current) clearInterval(tickRef.current);
    setPhase("processing");
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop(); // onstop handles transcription + submit
    } else {
      stopStreams();
      void submitTranscript("");
    }
  }

  async function mulai() {
    setError(null);
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = screen;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = screen;
        await screenVideoRef.current.play().catch(() => {});
      }
      // Stopping the share (browser UI) ends the presentation.
      screen.getVideoTracks()[0]?.addEventListener("ended", finish);

      // Record the presenter's voice for transcription.
      let mic: MediaStream | null = null;
      try {
        mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = mic;
      } catch {
        mic = null; // no mic → screen-only demo, transcript stays empty
      }

      if (mic) {
        const recorder = new MediaRecorder(mic);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          stopStreams();
          try {
            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            if (blob.size === 0) return void submitTranscript("");
            const form = new FormData();
            form.append("file", blob, "presentasi.webm");
            const res = await fetch("/api/transcribe", {
              method: "POST",
              body: form,
            });
            const data = await res.json().catch(() => ({}));
            await submitTranscript((data.text ?? "").trim());
          } catch {
            await submitTranscript("");
          }
        };
        recorder.start();
        recorderRef.current = recorder;
      }

      setPhase("live");
      setRemaining(total);
      drawTimer(total);
      document.title = `${fmt(total)} • ${t.presentasiTitle}`;
      void enterPip();
      // Countdown waits for the first spoken word; without a mic it starts now.
      if (mic) {
        setWaitingVoice(true);
        startVad(mic);
      } else {
        startCountdown();
      }
    } catch {
      setError(t.startFailed);
    }
  }

  async function lewati() {
    finishedRef.current = true;
    stopStreams();
    setPhase("processing");
    await submitTranscript("");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-6 sm:py-12">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-warm-paper/50">
        {t.eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
        {phase === "live"
          ? t.liveTitle
          : phase === "processing"
            ? t.processingTitle
            : t.idleTitle}
      </h1>
      <p className="mt-3 text-warm-paper/70">
        {t.intro1a} {durasiMenit} {t.intro1b}
      </p>
      <p className="mt-2 text-sm text-warm-paper/50">{t.intro2}</p>

      {error && (
        <p className="mt-6 border-l-2 border-critique-rust bg-critique-rust/10 px-4 py-3 text-sm text-critique-rust">
          {error}
        </p>
      )}

      {phase === "idle" && !screenShareSupported && (
        <p className="mt-6 border-l-2 border-spotlight-amber bg-spotlight-amber/10 px-4 py-3 text-sm text-warm-paper/80">
          {t.desktopOnly}
        </p>
      )}

      {/* Off-screen elements powering the floating (PiP) countdown. */}
      <canvas ref={canvasRef} width={360} height={140} className="hidden" />
      <video ref={pipVideoRef} muted playsInline className="hidden" />

      {/* Screen preview */}
      <div className="mt-8 aspect-video w-full overflow-hidden border border-navy-line bg-navy-soft">
        {phase === "live" ? (
          <video
            ref={screenVideoRef}
            muted
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-warm-paper/40">
            <MonitorUp size={40} strokeWidth={1.25} />
            <span className="font-mono text-[11px] uppercase tracking-[0.15em]">
              {phase === "processing" ? t.selesai : t.layarBelum}
            </span>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <span
          className={`inline-flex items-center gap-2 font-mono text-lg ${
            remaining <= 30 ? "text-critique-rust" : "text-spotlight-amber"
          }`}
        >
          <Timer size={18} strokeWidth={1.5} />
          {fmt(remaining)}
        </span>

        <div className="flex gap-3">
          {phase === "idle" && (
            <>
              <button
                onClick={lewati}
                className="inline-flex items-center gap-2 border border-navy-line px-4 py-2.5 text-sm text-warm-paper/70 transition-colors hover:text-warm-paper"
              >
                <SkipForward size={16} strokeWidth={1.5} />
                {t.skip}
              </button>
              <button
                onClick={mulai}
                disabled={!screenShareSupported}
                title={screenShareSupported ? undefined : t.desktopOnlyTitle}
                className="inline-flex items-center gap-2 border border-spotlight-amber bg-spotlight-amber px-5 py-2.5 text-sm font-medium text-warm-paper transition-colors hover:bg-[#a06a15] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MonitorUp size={16} strokeWidth={1.5} />
                {t.start}
              </button>
            </>
          )}
          {phase === "live" && (
            <button
              onClick={finish}
              className="inline-flex items-center gap-2 border border-critique-rust px-5 py-2.5 text-sm font-medium text-critique-rust transition-colors hover:bg-critique-rust/10"
            >
              <StopCircle size={16} strokeWidth={1.5} />
              {t.finish}
            </button>
          )}
          {phase === "processing" && (
            <span className="inline-flex items-center gap-2 text-sm text-warm-paper/60">
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              {t.processing}
            </span>
          )}
        </div>
      </div>

      {phase === "live" && (
        <p
          className={`mt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] ${
            waitingVoice ? "text-spotlight-amber" : "text-critique-rust"
          }`}
        >
          <Radio size={13} strokeWidth={1.5} />
          {waitingVoice ? t.waitingVoice : t.recordingVoice}
        </p>
      )}
    </div>
  );
}

function fmt(total: number): string {
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
