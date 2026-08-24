"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Mic,
  MicOff,
  PanelRightClose,
  PanelRightOpen,
  Timer,
  Volume2,
  VolumeX,
} from "lucide-react";

import { DoorOpen, Eye, EyeOff, FlagOff, Radio, Zap } from "lucide-react";

import { AvatarStage } from "@/components/session/AvatarStage";
import { PERSONA_META, personaLabel } from "@/components/session/personaMeta";
import { PresentationPhase } from "@/components/session/PresentationPhase";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useI18n } from "@/i18n/client";

type Turn = {
  id: string;
  urutan: number;
  persona: string;
  pertanyaan: string;
  jawaban: string | null;
  target_peran?: string | null;
  target_nama?: string | null;
  is_followup?: boolean;
};


export function LiveSession({
  sessionId,
  personaOrder,
  durasiMenit,
  sisaDetik,
  initialTurns,
  gaya,
  outputLanguage = "id",
  initialVoice = false,
  denganPresentasi = false,
  durasiPresentasiMenit = 0,
  presentasiSelesai = false,
}: {
  sessionId: string;
  personaOrder: string[];
  durasiMenit: number;
  sisaDetik: number;
  initialTurns: Turn[];
  gaya: string;
  outputLanguage?: string;
  initialVoice?: boolean;
  denganPresentasi?: boolean;
  durasiPresentasiMenit?: number;
  presentasiSelesai?: boolean;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.live;
  const [phase, setPhase] = useState<"presentasi" | "tanya">(
    denganPresentasi && !presentasiSelesai ? "presentasi" : "tanya",
  );
  const [transcript, setTranscript] = useState<Turn[]>(
    initialTurns.filter((t) => t.jawaban !== null),
  );
  const [current, setCurrent] = useState<Turn | null>(null);
  const [answer, setAnswer] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [endDialog, setEndDialog] = useState(false);
  const [ending, setEnding] = useState(false);
  const [remaining, setRemaining] = useState(Math.max(0, sisaDetik));
  const totalDetik = durasiMenit * 60;

  // Voice
  const [voiceOn, setVoiceOn] = useState(initialVoice);
  const [didVideoUrl, setDidVideoUrl] = useState<string | null>(null);
  const didVideoRef = useRef<HTMLVideoElement | null>(null);
  const [showText, setShowText] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const amplitudeRef = useRef<number>(0);

  // Full-voice answer + camera
  const [cameraOn, setCameraOn] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [listening, setListening] = useState(false);
  const recordStartRef = useRef<number>(0);
  const recordMsRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Voice-activity detection (hands-free)
  const micCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const vadRafRef = useRef<number | null>(null);
  const speechStartedRef = useRef<boolean>(false);
  const lastVoiceTsRef = useRef<number>(0);

  const loadNext = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/next`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? t.errLoadFailed);
      if (data.done) {
        setCurrent(null);
        setDone(true);
      } else {
        setCurrent(data.turn);
        setAnswer("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errGeneric);
    } finally {
      setBusy(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (phase !== "tanya") return;
    void loadNext();
  }, [loadNext, phase]);

  // Session countdown — the session ends when the chosen duration runs out.
  useEffect(() => {
    if (phase !== "tanya") return;
    if (done) return;
    if (remaining <= 0) {
      setDone(true);
      return;
    }
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining, done, phase]);

  // Load available TTS voices (populated asynchronously by the browser).
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Set up the Web Audio analyser once, wired to the hidden <audio> element.
  function ensureAnalyser() {
    const audio = audioElRef.current;
    if (!audio) return null;
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }
    return analyserRef.current;
  }

  function startLipSync() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((s, v) => s + v, 0) / data.length;
      const amp = Math.min(1, (avg / 255) * 2.2);
      amplitudeRef.current = amp;
      setAmplitude(amp);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopLipSync() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    amplitudeRef.current = 0;
    setAmplitude(0);
  }

  function browserFallbackTTS(turn: Turn) {
    // No speech engine → don't leave the user stuck; jump straight to listening.
    if (typeof window === "undefined" || !window.speechSynthesis) {
      maybeAutoListen();
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(turn.pertanyaan);
    const bcp = outputLanguage === "en" ? "en-US" : "id-ID";
    const prefix = outputLanguage === "en" ? "en" : "id";
    utter.lang = bcp;
    const voices = voicesRef.current;
    const langVoice =
      voices.find((v) => v.lang === bcp) ??
      voices.find((v) => v.lang?.toLowerCase().startsWith(prefix));
    if (langVoice) utter.voice = langVoice;
    const meta = PERSONA_META[turn.persona];
    utter.rate = turn.is_followup ? 1.08 : meta?.rate ?? 1.02;
    utter.pitch = turn.is_followup ? 1.2 : meta?.pitch ?? 1.05;
    utter.onend = () => maybeAutoListen();
    utter.onerror = () => maybeAutoListen();
    window.speechSynthesis.speak(utter);
  }

  // Play a question with the TTS voice + amplitude lip-sync (portrait path).
  async function playTts(turn: Turn) {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: turn.pertanyaan,
          persona: turn.persona,
          gaya,
          output_language: outputLanguage,
          is_followup: turn.is_followup,
        }),
      });
      if (!res.ok) {
        browserFallbackTTS(turn);
        return;
      }
      const buf = await res.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      const audio = audioElRef.current;
      if (!audio) return;
      ensureAnalyser();
      await audioCtxRef.current?.resume();
      audio.src = url;
      audio.onplay = startLipSync;
      audio.onended = () => {
        stopLipSync();
        maybeAutoListen();
      };
      audio.onpause = stopLipSync;
      // Autoplay may be blocked without a gesture → reject; fall back to TTS/listen.
      await audio.play();
    } catch {
      browserFallbackTTS(turn);
    }
  }

  // Speak each new question. Portrait + TTS start immediately so the session
  // never stalls; a D-ID talking-photo video is fetched in the background and
  // swapped in only if it arrives before the candidate starts answering
  // (D-ID renders take ~15–40s and can hang on trial plans).
  useEffect(() => {
    if (!current || done) return;
    let cancelled = false;
    const turn = current;
    setDidVideoUrl(null);

    // 1) Start portrait + voice right away — no blocking on D-ID.
    if (voiceOn) {
      void playTts(turn);
    } else {
      setTimeout(() => maybeAutoListen(), 600);
    }

    // 2) Background: try a D-ID talking photo; swap in if it beats the answer.
    (async () => {
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 30000);
        const res = await fetch("/api/avatar/talk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: turn.pertanyaan,
            persona: turn.persona,
            gaya,
            output_language: outputLanguage,
          }),
          signal: ctrl.signal,
        });
        clearTimeout(to);
        const data = await res.json().catch(() => ({}));
        const stillWaiting = recorderRef.current?.state !== "recording";
        if (!cancelled && stillWaiting && data.enabled && data.video_url) {
          // Stop the interim TTS voice; the video carries its own audio.
          audioElRef.current?.pause();
          if (typeof window !== "undefined" && window.speechSynthesis)
            window.speechSynthesis.cancel();
          stopLipSync();
          setDidVideoUrl(data.video_url);
        }
      } catch {
        /* stay on portrait + TTS */
      }
    })();

    return () => {
      cancelled = true;
      const audio = audioElRef.current;
      if (audio) {
        audio.pause();
        audio.onplay = null;
        audio.onended = null;
        audio.onpause = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis)
        window.speechSynthesis.cancel();
      stopLipSync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, voiceOn, gaya, done]);

  // Clean up mic/VAD on unmount.
  useEffect(() => {
    return () => {
      if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current);
      try {
        recorderRef.current?.stop();
      } catch {
        /* already stopped */
      }
      void micCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // Camera: request once for expression analysis (optional consent). Held until
  // the Q&A phase so it doesn't clash with the presentation's screen share.
  useEffect(() => {
    if (phase !== "tanya") return;
    let stream: MediaStream | null = null;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        camStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraOn(true);
      } catch {
        setCameraOn(false);
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [phase]);

  // Attach the camera stream once the <video> element mounts (it only renders
  // when a question is active, after the request above has resolved).
  useEffect(() => {
    const video = videoRef.current;
    if (video && camStreamRef.current && !video.srcObject) {
      video.srcObject = camStreamRef.current;
      video.play().catch(() => {});
    }
  }, [current, cameraOn]);

  function capturePhoto(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !cameraOn) return resolve(null);
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.7);
    });
  }

  function computeDelivery(text: string, durationMs: number) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const durasi_detik = Math.max(1, Math.round(durationMs / 1000));
    const fillers = ["eee", "eh", "anu", "kayak", "gitu", "apa ya", "hmm", "em"];
    const lower = text.toLowerCase();
    const filler = fillers.reduce(
      (n, f) => n + (lower.match(new RegExp(`\\b${f}\\b`, "g"))?.length ?? 0),
      0,
    );
    return {
      jumlah_kata: words.length,
      durasi_detik,
      wpm: Math.round((words.length / durasi_detik) * 60),
      filler,
    };
  }

  // Hands-free voice-activity detection: auto-stop after the user goes silent.
  const VAD_THRESHOLD = 0.045; // amplitude (0..1) that counts as speech
  const VAD_SILENCE_MS = 1500; // silence after speech → stop
  const VAD_MIN_SPEECH_MS = 500; // ignore blips shorter than this

  function stopVad() {
    if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current);
    vadRafRef.current = null;
    setListening(false);
  }

  function startVad(stream: MediaStream) {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = micCtxRef.current ?? new Ctx();
      micCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      micAnalyserRef.current = analyser;
      speechStartedRef.current = false;
      lastVoiceTsRef.current = Date.now();
      setListening(true);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length / 255;
        const now = Date.now();
        if (avg > VAD_THRESHOLD) {
          if (!speechStartedRef.current &&
              now - recordStartRef.current > VAD_MIN_SPEECH_MS) {
            speechStartedRef.current = true;
          }
          lastVoiceTsRef.current = now;
        } else if (
          speechStartedRef.current &&
          now - lastVoiceTsRef.current > VAD_SILENCE_MS
        ) {
          stopVad();
          stopRecording();
          return;
        }
        vadRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // VAD unavailable → fall back to manual stop.
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  function toggleRecording() {
    if (recording) stopRecording();
    else void startRecording();
  }

  function maybeAutoListen() {
    if (!autoMode || !current || done) return;
    if (recorderRef.current && recorderRef.current.state === "recording") return;
    if (transcribing || busy) return;
    void startRecording();
  }


  async function startRecording() {
    setVoiceError(null);
    if (recording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError(t.errRecordUnsupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recordStartRef.current = Date.now();
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopVad();
        recordMsRef.current = Date.now() - recordStartRef.current;
        setRecording(false);
        setTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const form = new FormData();
          form.append("file", blob, "jawaban.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail ?? data.error ?? t.errTranscribeFailed);
          const text = (data.text ?? "").trim();
          setTranscribing(false);
          // Tolak hasil transkripsi yang terlalu pendek — kemungkinan besar
          // adalah noise atau halusinasi Whisper dari background audio.
          const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
          if (text && wordCount >= 3) {
            await submitAnswer(text);
          } else {
            setVoiceError(t.errNoVoice);
          }
        } catch (e) {
          setVoiceError(e instanceof Error ? e.message : t.errTranscribeFailed);
          setTranscribing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      if (autoMode) startVad(stream);
    } catch {
      setVoiceError(t.errMicAccess);
    }
  }

  async function submitAnswer(text: string) {
    const turn = current;
    if (!turn) return;
    setBusy(true);
    setError(null);
    try {
      const delivery = computeDelivery(text, recordMsRef.current);
      const res = await fetch(`/api/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turn_id: turn.id,
          jawaban: text,
          waktu_tempuh_ms: recordMsRef.current,
          delivery,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? t.errSubmitFailed);

      // Fire-and-forget expression analysis from a webcam frame.
      const photo = await capturePhoto();
      if (photo) {
        const form = new FormData();
        form.append("photo", photo, "frame.jpg");
        fetch(`/api/sessions/${sessionId}/turns/${turn.id}/observe`, {
          method: "POST",
          body: form,
        }).catch(() => {});
      }

      setTranscript((prev) => [...prev, { ...turn, jawaban: text }]);
      setAnswer("");
      await loadNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errGeneric);
      setBusy(false);
    }
  }

  async function lihatScorecard() {
    setFinishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/scorecard`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? t.errScoreFailed);
      router.push(`/session/${sessionId}/scorecard`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errGeneric);
      setFinishing(false);
    }
  }

  async function lanjutNanti() {
    if (typeof window !== "undefined" && window.speechSynthesis)
      window.speechSynthesis.cancel();
    audioElRef.current?.pause();
    // Freeze the session clock so no time is lost while away.
    await fetch(`/api/sessions/${sessionId}/jeda`, { method: "POST" }).catch(
      () => {},
    );
    router.push("/dashboard");
  }

  async function akhiriSesi() {
    setEnding(true);
    // With at least one answer, compile a partial scorecard; otherwise just leave.
    if (transcript.length > 0) {
      const res = await fetch(`/api/sessions/${sessionId}/scorecard`, {
        method: "POST",
      });
      if (res.ok) {
        router.push(`/session/${sessionId}/scorecard`);
        return;
      }
    }
    router.push("/dashboard");
  }

  const answered = transcript.length;
  const activePersona = current?.persona;

  if (phase === "presentasi") {
    return (
      <div className="flex min-h-screen flex-col bg-ink-navy text-warm-paper">
        <PresentationPhase
          sessionId={sessionId}
          durasiMenit={durasiPresentasiMenit}
          onDone={() => setPhase("tanya")}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-ink-navy text-warm-paper">
      <audio ref={audioElRef} hidden />
      <ConfirmModal
        open={endDialog}
        title={t.endDialogTitle}
        message={answered > 0 ? t.endDialogWith : t.endDialogWithout}
        confirmLabel={answered > 0 ? t.endConfirmWith : t.endConfirmWithout}
        tone="danger"
        loading={ending}
        onConfirm={akhiriSesi}
        onCancel={() => !ending && setEndDialog(false)}
      />
      <div className="flex flex-1 flex-col">
        {/* Top bar: personas + timer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-line px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] sm:gap-2">
            {personaOrder.map((p) => {
              const Icon = PERSONA_META[p]?.icon;
              return (
                <span
                  key={p}
                  className={`inline-flex items-center gap-1.5 border px-3 py-1.5 ${
                    activePersona === p
                      ? "border-spotlight-amber text-spotlight-amber"
                      : "border-navy-line text-warm-paper/40"
                  }`}
                >
                  {Icon && <Icon size={13} strokeWidth={1.5} />}
                  <span className="hidden sm:inline">{personaLabel(p)}</span>
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <span
              className={`inline-flex items-center gap-2 font-mono text-sm ${
                remaining <= 60 ? "text-critique-rust" : "text-spotlight-amber"
              }`}
              title={t.remainingTime}
            >
              <Timer size={16} strokeWidth={1.5} />
              {fmt(remaining)}
            </span>
            <button
              onClick={() => setAutoMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 transition-colors ${
                autoMode ? "text-spotlight-amber" : "text-warm-paper/50 hover:text-warm-paper"
              }`}
              title={autoMode ? t.autoOn : t.manualOn}
            >
              <Zap size={18} strokeWidth={1.5} />
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.15em] sm:inline">
                {autoMode ? t.auto : t.manual}
              </span>
            </button>
            <button
              onClick={() => setVoiceOn((v) => !v)}
              className={`transition-colors ${
                voiceOn ? "text-spotlight-amber" : "text-warm-paper/50 hover:text-warm-paper"
              }`}
              aria-label={t.toggleVoice}
              title={voiceOn ? t.voiceOff : t.voiceOn}
            >
              {voiceOn ? (
                <Volume2 size={20} strokeWidth={1.5} />
              ) : (
                <VolumeX size={20} strokeWidth={1.5} />
              )}
            </button>
            <button
              onClick={lanjutNanti}
              className="inline-flex items-center gap-1.5 text-warm-paper/50 transition-colors hover:text-warm-paper"
              title={t.continueLaterTitle}
            >
              <DoorOpen size={18} strokeWidth={1.5} />
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.15em] sm:inline">
                {t.continueLater}
              </span>
            </button>
            <button
              onClick={() => setEndDialog(true)}
              className="inline-flex items-center gap-1.5 text-warm-paper/50 transition-colors hover:text-critique-rust"
              title={t.endTitle}
            >
              <FlagOff size={18} strokeWidth={1.5} />
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.15em] sm:inline">
                {t.end}
              </span>
            </button>
            <button
              onClick={() => setShowPanel((v) => !v)}
              className="text-warm-paper/50 transition-colors hover:text-warm-paper"
              aria-label={t.toggleTranscript}
            >
              {showPanel ? (
                <PanelRightClose size={20} strokeWidth={1.5} />
              ) : (
                <PanelRightOpen size={20} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* Time progress */}
        <div className="px-6 pt-4">
          <div className="h-1 w-full bg-navy-line">
            <div
              className="h-1 bg-spotlight-amber transition-all duration-1000 ease-linear"
              style={{
                width: `${Math.min(100, ((totalDetik - remaining) / totalDetik) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Stage */}
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
          {error && (
            <p className="mb-6 border-l-2 border-critique-rust bg-critique-rust/10 px-4 py-3 text-sm text-critique-rust">
              {error}
            </p>
          )}

          {done ? (
            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-warm-paper/50">
                {t.doneEyebrow}
              </p>
              <h1 className="mt-4 font-display text-3xl font-semibold">
                {t.doneTitle}
              </h1>
              <p className="mt-3 text-warm-paper/70">{t.doneSubtitle}</p>
              <button
                onClick={lihatScorecard}
                disabled={finishing}
                className="mt-8 inline-flex items-center gap-2 border border-spotlight-amber bg-spotlight-amber px-6 py-3 text-sm font-medium text-warm-paper transition-colors hover:bg-[#a06a15] disabled:opacity-60"
              >
                {finishing ? (
                  <>
                    <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                    {t.compilingScorecard}
                  </>
                ) : (
                  t.viewScorecard
                )}
              </button>
            </div>
          ) : busy && !current ? (
            <div className="flex items-center justify-center gap-3 text-warm-paper/60">
              <Loader2 size={20} strokeWidth={1.5} className="animate-spin" />
              {t.preparingQuestion}
            </div>
          ) : current ? (
            <>
              <div className="flex items-center gap-4">
                {didVideoUrl ? (
                  <div
                    style={{ width: voiceOn && !showText ? 150 : 84, height: voiceOn && !showText ? 150 : 84 }}
                    className="relative overflow-hidden rounded-full border-2 border-spotlight-amber bg-navy-soft"
                  >
                    <video
                      ref={didVideoRef}
                      src={didVideoUrl}
                      autoPlay
                      playsInline
                      onEnded={() => maybeAutoListen()}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <AvatarStage
                    persona={current.persona}
                    amplitude={amplitude}
                    speaking={voiceOn}
                    size={voiceOn && !showText ? 150 : 84}
                  />
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-display text-lg font-semibold text-warm-paper">
                    {personaLabel(current.persona)}
                    {current.is_followup && (
                      <span className="rounded-sm border border-critique-rust px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-critique-rust">
                        {t.followup}
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-warm-paper/50">
                    {PERSONA_META[current.persona]?.fokus} · {t.questionNo}
                    {current.urutan}
                  </p>
                </div>
              </div>
              {current.target_peran && (
                <p className="mt-3 inline-flex w-fit items-center gap-2 border border-spotlight-amber px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-spotlight-amber">
                  {t.answerTurn} {current.target_peran}
                  {current.target_nama ? ` · ${current.target_nama}` : ""}
                </p>
              )}

              {voiceOn && !showText ? (
                <div className="mt-6 flex flex-col items-start gap-3 border-y border-navy-line py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="font-mono text-sm uppercase tracking-[0.2em] text-warm-paper/50">
                    {t.listenQuestion}
                  </p>
                  <button
                    onClick={() => setShowText(true)}
                    className="inline-flex items-center gap-2 border border-navy-line px-3 py-2 text-xs text-warm-paper/70 transition-colors hover:text-warm-paper"
                  >
                    <Eye size={16} strokeWidth={1.5} />
                    {t.showText}
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="mt-5 font-display text-3xl leading-snug font-semibold sm:text-4xl">
                    {current.pertanyaan}
                  </h1>
                  {voiceOn && (
                    <button
                      onClick={() => setShowText(false)}
                      className="mt-3 inline-flex items-center gap-2 text-xs text-warm-paper/50 transition-colors hover:text-warm-paper"
                    >
                      <EyeOff size={14} strokeWidth={1.5} />
                      {t.hideText}
                    </button>
                  )}
                </>
              )}

              {/* Full-voice answer area */}
              <div className="mt-8 flex items-start gap-4">
                {/* Self-view */}
                <div className="relative hidden shrink-0 sm:block">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="h-24 w-32 -scale-x-100 border border-navy-line bg-navy-soft object-cover"
                  />
                  <span className="absolute bottom-1 left-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-warm-paper/70">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        cameraOn ? "bg-growth-teal" : "bg-critique-rust"
                      }`}
                    />
                    {cameraOn ? t.camera : t.cameraOff}
                  </span>
                </div>

                <div className="flex-1">
                  {voiceError && (
                    <p className="mb-2 text-sm text-critique-rust">{voiceError}</p>
                  )}

                  <div className="flex flex-col items-center gap-3 border border-dashed border-navy-line bg-navy-soft/50 px-6 py-8">
                    <button
                      onClick={toggleRecording}
                      disabled={transcribing || busy}
                      className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-60 ${
                        recording
                          ? `border-critique-rust text-critique-rust ${listening ? "animate-pulse" : ""}`
                          : "border-spotlight-amber text-spotlight-amber hover:bg-spotlight-amber/10"
                      }`}
                    >
                      {transcribing || busy ? (
                        <Loader2 size={24} strokeWidth={1.5} className="animate-spin" />
                      ) : recording ? (
                        listening ? (
                          <Radio size={24} strokeWidth={1.5} />
                        ) : (
                          <MicOff size={24} strokeWidth={1.5} />
                        )
                      ) : (
                        <Mic size={24} strokeWidth={1.5} />
                      )}
                    </button>
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-warm-paper/50">
                      {busy
                        ? t.recSending
                        : transcribing
                          ? t.recTranscribing
                          : recording
                            ? autoMode
                              ? t.recListening
                              : t.recRecording
                            : autoMode
                              ? t.recAutoIdle
                              : t.recManualIdle}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <canvas ref={canvasRef} hidden />

      {/* Transcript side panel — overlay drawer on mobile, static column on desktop */}
      {showPanel && (
        <>
          <button
            aria-label={t.closeTranscript}
            onClick={() => setShowPanel(false)}
            className="fixed inset-0 z-30 bg-ink-navy/60 lg:hidden"
          />
          <aside className="fixed inset-y-0 right-0 z-40 w-80 max-w-[85vw] shrink-0 overflow-y-auto border-l border-navy-line bg-navy-soft px-5 py-6 lg:static lg:z-auto lg:max-w-none">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-warm-paper/40">
            {t.transcript}
          </p>
          {transcript.length === 0 ? (
            <p className="mt-4 text-sm text-warm-paper/50">{t.noAnswersYet}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-5">
              {transcript.map((t) => (
                <li key={t.id}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-spotlight-amber">
                    {personaLabel(t.persona)}
                  </p>
                  <p className="mt-1 text-sm text-warm-paper/85">{t.pertanyaan}</p>
                  <p className="mt-2 border-l border-navy-line pl-3 text-sm text-warm-paper/60">
                    {t.jawaban}
                  </p>
                </li>
              ))}
            </ul>
          )}
          </aside>
        </>
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
