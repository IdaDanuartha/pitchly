"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { PERSONA_META, personaLabel } from "@/components/session/personaMeta";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/client";
import type { Billing } from "@/lib/billing";

type Team = { id: string; nama_tim: string; members: { id: string }[] };
type Rubric = { id: string; nama_kompetisi: string };

// Category value keys per jenis (labels come from the dictionary).
const KATEGORI_KEYS: Record<"kompetisi" | "akademik", string[]> = {
  kompetisi: [
    "umum",
    "hackathon",
    "software",
    "data_ai",
    "uiux",
    "business_case",
    "business_plan",
  ],
  akademik: ["sempro", "skripsi", "ujian"],
};

// Panel persona composition per kategori (descriptions come from the dictionary).
const PANEL_PERSONAS: Record<string, string[]> = {
  umum: ["teknis", "dampak", "skeptis"],
  hackathon: ["teknis", "dampak", "skeptis"],
  software: ["teknis", "dampak", "skeptis"],
  data_ai: ["teknis", "dampak", "skeptis"],
  uiux: ["desain", "riset", "skeptis"],
  business_case: ["bisnis", "dampak", "skeptis"],
  business_plan: ["bisnis", "pasar", "skeptis"],
  sempro: ["metodologi", "kajian", "penguji"],
  skripsi: ["metodologi", "kajian", "penguji"],
  ujian: ["penguji"],
};

export function MulaiSimulasiButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { locale, dict } = useI18n();
  const t = dict.mulai;
  const [billing, setBilling] = useState<Billing | null>(null);
  const [jenis, setJenis] = useState<"kompetisi" | "akademik">("kompetisi");
  const [kategori, setKategori] = useState("umum");
  const [mode, setMode] = useState<"individu" | "tim">("individu");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>("");
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [rubricId, setRubricId] = useState<string>("");
  const [gaya, setGaya] = useState("seimbang");
  const [kedalaman, setKedalaman] = useState("ringkas");
  const [durasi, setDurasi] = useState("15");
  const [bahasa, setBahasa] = useState("formal");
  const [voice, setVoice] = useState(true);
  const [denganPresentasi, setDenganPresentasi] = useState(false);
  const [durasiPresentasi, setDurasiPresentasi] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Team[]) => {
        const withMembers = data.filter((t) => t.members.length > 0);
        setTeams(withMembers);
        if (withMembers.length) setTeamId(withMembers[0].id);
      })
      .catch(() => {});
    fetch("/api/rubrics")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Rubric[]) => setRubrics(data))
      .catch(() => {});
    fetch("/api/billing/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Billing | null) => setBilling(data))
      .catch(() => {});
  }, []);

  const ent = billing?.entitlements;
  const presentasiAllowed = ent ? ent.presentasi : true;
  const timAllowed = ent ? ent.tim : true;
  const kuota = billing?.usage.sesi_kuota ?? null;
  const dipakai = billing?.usage.sesi_dipakai ?? 0;
  const quotaHabis = kuota != null && dipakai >= kuota;

  async function mulai() {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, string | number | boolean> = {
        document_id: documentId,
        jenis,
        kategori,
        gaya,
        kedalaman,
        bahasa,
        output_language: locale,
        durasi_menit: Number(durasi),
        dengan_presentasi: denganPresentasi,
        durasi_presentasi_menit: denganPresentasi ? Number(durasiPresentasi) : 0,
      };
      if (jenis === "kompetisi" && mode === "tim" && teamId) body.team_id = teamId;
      if (rubricId) body.rubric_id = rubricId;
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? t.errStart);
      router.push(`/sesi/${data.id}${voice ? "?voice=1" : ""}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : dict.common.error;
      setError(msg);
      toast(msg, "error");
      setBusy(false);
    }
  }

  return (
    <div className="w-full border border-paper-line bg-paper-soft p-6">
      <h3 className="font-display text-lg font-semibold text-ink-navy">
        {t.title}
      </h3>
      <p className="mt-1 text-sm text-ink-gray">{t.subtitle}</p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Segmented
          label={t.jenisSesi}
          value={jenis}
          onChange={(v) => {
            const j = v as "kompetisi" | "akademik";
            setJenis(j);
            setKategori(KATEGORI_KEYS[j][0]);
            if (j === "akademik") setMode("individu");
          }}
          options={[
            ["kompetisi", t.kompetisi],
            ["akademik", t.akademik],
          ]}
        />
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
            {jenis === "akademik" ? t.jenisSidang : t.kategoriLomba}
          </span>
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="mt-1.5 block w-full border border-ink-navy/20 bg-warm-paper px-3 py-2 text-sm text-ink-navy focus:border-ink-navy focus:outline-none"
          >
            {KATEGORI_KEYS[jenis].map((val) => (
              <option key={val} value={val}>
                {t.kategoriLabels[val as keyof typeof t.kategoriLabels]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {PANEL_PERSONAS[kategori] && (
        <div className="mt-4 border border-paper-line bg-warm-paper p-4">
          <p className="text-sm text-ink-gray">
            {t.panelDesc[kategori as keyof typeof t.panelDesc]}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PANEL_PERSONAS[kategori].map((p) => {
              const Icon = PERSONA_META[p]?.icon;
              return (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 border border-ink-navy/20 px-2.5 py-1 text-xs text-ink-navy"
                >
                  {Icon && <Icon size={13} strokeWidth={1.5} />}
                  {personaLabel(p)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Segmented
          label={t.gaya}
          value={gaya}
          onChange={setGaya}
          options={[
            ["kritis", t.kritis],
            ["seimbang", t.seimbang],
            ["santai", t.santai],
          ]}
        />
        <Segmented
          label={t.kedalaman}
          value={kedalaman}
          onChange={setKedalaman}
          options={[
            ["ringkas", t.ringkas],
            ["detail", t.detail],
          ]}
        />
        <Segmented
          label={t.durasiTanya}
          value={durasi}
          onChange={setDurasi}
          options={[
            ["10", `10 ${t.mnt}`],
            ["15", `15 ${t.mnt}`],
            ["20", `20 ${t.mnt}`],
            ["30", `30 ${t.mnt}`],
          ]}
        />
        <Segmented
          label={t.bahasa}
          value={bahasa}
          onChange={setBahasa}
          options={[
            ["formal", t.formal],
            ["santai", t.bahasaSantai],
          ]}
        />
        <Segmented
          label={t.mode}
          value={mode}
          onChange={(v) => setMode(v as "individu" | "tim")}
          options={
            jenis === "kompetisi" && teams.length && timAllowed
              ? [
                  ["individu", t.individu],
                  ["tim", t.tim],
                ]
              : [["individu", t.individu]]
          }
        />
        <Segmented
          label={t.modeSuara}
          value={voice ? "on" : "off"}
          onChange={(v) => setVoice(v === "on")}
          options={[
            ["off", t.teks],
            ["on", t.suara],
          ]}
        />
        <Segmented
          label={t.formatSesi}
          value={denganPresentasi ? "presentasi" : "tanya"}
          onChange={(v) => {
            if (v === "presentasi" && !presentasiAllowed) {
              toast(t.presentasiProToast, "info");
              return;
            }
            setDenganPresentasi(v === "presentasi");
          }}
          options={[
            ["tanya", t.tanyaJawab],
            [
              "presentasi",
              presentasiAllowed ? t.presentasiPlus : t.presentasiPro,
            ],
          ]}
        />
        {denganPresentasi && (
          <Segmented
            label={t.durasiPresentasi}
            value={durasiPresentasi}
            onChange={setDurasiPresentasi}
            options={[
              ["3", `3 ${t.mnt}`],
              ["5", `5 ${t.mnt}`],
              ["10", `10 ${t.mnt}`],
              ["15", `15 ${t.mnt}`],
            ]}
          />
        )}
      </div>

      {denganPresentasi && (
        <p className="mt-3 text-xs text-ink-gray">{t.presentasiNote}</p>
      )}

      {mode === "tim" && teams.length > 0 && (
        <div className="mt-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
            {t.pilihTim}
          </span>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="mt-1.5 block w-full border border-ink-navy/20 bg-warm-paper px-3 py-2 text-sm text-ink-navy focus:border-ink-navy focus:outline-none"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nama_tim}
              </option>
            ))}
          </select>
        </div>
      )}
      {mode === "tim" && teams.length === 0 && (
        <p className="mt-3 text-xs text-ink-gray">
          {t.belumTimA}{" "}
          <Link href="/dashboard/tim" className="text-spotlight-amber hover:underline">
            {t.buatTim}
          </Link>
          .
        </p>
      )}

      {rubrics.length > 0 && (
        <div className="mt-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
            {t.rubrikOpsional}
          </span>
          <select
            value={rubricId}
            onChange={(e) => setRubricId(e.target.value)}
            className="mt-1.5 block w-full border border-ink-navy/20 bg-warm-paper px-3 py-2 text-sm text-ink-navy focus:border-ink-navy focus:outline-none"
          >
            <option value="">{t.rubrikUmum}</option>
            {rubrics.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nama_kompetisi}
              </option>
            ))}
          </select>
        </div>
      )}

      {quotaHabis && (
        <div className="mt-5 border-l-2 border-spotlight-amber bg-spotlight-amber/10 px-4 py-3 text-sm text-ink-navy">
          {t.quotaHabisA} ({dipakai}/{kuota}).{" "}
          <Link
            href="/dashboard/langganan"
            className="font-medium text-spotlight-amber hover:underline"
          >
            {t.upgrade}
          </Link>{" "}
          {t.quotaHabisB}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-critique-rust">{error}</p>}

      <button
        onClick={mulai}
        disabled={busy || quotaHabis}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 border border-spotlight-amber bg-spotlight-amber px-5 py-3 text-sm font-medium text-warm-paper transition-colors hover:bg-[#a06a15] disabled:opacity-60 sm:w-auto"
      >
        {busy ? (
          <>
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            {t.prepping}
          </>
        ) : (
          <>
            {t.startButton}
            <ArrowRight size={16} strokeWidth={1.5} />
          </>
        )}
      </button>
    </div>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
        {label}
      </span>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map(([val, text]) => (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`border px-3 py-1.5 text-xs transition-colors ${
              value === val
                ? "border-ink-navy bg-ink-navy text-warm-paper"
                : "border-ink-navy/25 text-ink-gray hover:border-ink-navy/60"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
