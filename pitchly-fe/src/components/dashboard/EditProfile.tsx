"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/client";

export function EditProfile({
  initialNama,
  email,
  role,
  authProvider,
}: {
  initialNama: string;
  email: string;
  role: string;
  authProvider: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { dict } = useI18n();
  const t = dict.profile;
  const [nama, setNama] = useState(initialNama);
  const [savingNama, setSavingNama] = useState(false);

  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  async function simpanNama() {
    setSavingNama(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: nama.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? t.saveFailed);
      toast(t.nameUpdated, "success");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : dict.common.error, "error");
    } finally {
      setSavingNama(false);
    }
  }

  async function gantiSandi() {
    if (baru !== konfirmasi) {
      toast(t.pwMismatch, "error");
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password_lama: lama, password_baru: baru }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? t.changeFailed);
      toast(t.pwUpdated, "success");
      setLama("");
      setBaru("");
      setKonfirmasi("");
    } catch (e) {
      toast(e instanceof Error ? e.message : dict.common.error, "error");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* Profil */}
      <section className="border border-paper-line bg-paper-soft p-6">
        <h2 className="font-display text-lg font-semibold text-ink-navy">{t.section}</h2>
        <label className="mt-4 block">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
            {t.nama}
          </span>
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="mt-1.5 block w-full border border-ink-navy/20 bg-warm-paper px-3 py-2.5 text-sm text-ink-navy focus:border-ink-navy focus:outline-none"
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ReadonlyRow label={t.email} value={email} />
          <ReadonlyRow label={t.peran} value={role} />
        </div>
        <button
          onClick={simpanNama}
          disabled={savingNama || !nama.trim() || nama.trim() === initialNama}
          className="mt-5 inline-flex items-center gap-2 border border-spotlight-amber bg-spotlight-amber px-4 py-2.5 text-sm font-medium text-warm-paper transition-colors hover:bg-[#a06a15] disabled:opacity-50"
        >
          {savingNama && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
          {t.saveName}
        </button>
      </section>

      {/* Kata sandi — hanya akun lokal */}
      {authProvider === "local" && (
        <section className="border border-paper-line bg-paper-soft p-6">
          <h2 className="font-display text-lg font-semibold text-ink-navy">
            {t.changePwSection}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
                {t.pwOld}
              </span>
              <input
                type="password"
                value={lama}
                onChange={(e) => setLama(e.target.value)}
                className="mt-1.5 block w-full border border-ink-navy/20 bg-warm-paper px-3 py-2.5 text-sm text-ink-navy focus:border-ink-navy focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
                {t.pwNew}
              </span>
              <input
                type="password"
                value={baru}
                onChange={(e) => setBaru(e.target.value)}
                className="mt-1.5 block w-full border border-ink-navy/20 bg-warm-paper px-3 py-2.5 text-sm text-ink-navy focus:border-ink-navy focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
                {t.pwConfirm}
              </span>
              <input
                type="password"
                value={konfirmasi}
                onChange={(e) => setKonfirmasi(e.target.value)}
                className="mt-1.5 block w-full border border-ink-navy/20 bg-warm-paper px-3 py-2.5 text-sm text-ink-navy focus:border-ink-navy focus:outline-none"
              />
            </label>
          </div>
          <button
            onClick={gantiSandi}
            disabled={savingPw || !lama || baru.length < 6 || !konfirmasi}
            className="mt-5 inline-flex items-center gap-2 border border-ink-navy/25 px-4 py-2.5 text-sm text-ink-navy transition-colors hover:border-ink-navy/60 disabled:opacity-50"
          >
            {savingPw && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
            {t.updatePw}
          </button>
        </section>
      )}
    </div>
  );
}

function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
        {label}
      </span>
      <p className="mt-1.5 border border-paper-line bg-warm-paper px-3 py-2.5 text-sm text-ink-gray">
        {value}
      </p>
    </div>
  );
}
