"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldAlert, Trash2 } from "lucide-react";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/client";

type Dialog = "data" | "account" | null;

export function AccountDanger() {
  const router = useRouter();
  const toast = useToast();
  const { dict } = useI18n();
  const t = dict.danger;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);

  async function hapusData() {
    setBusy(true);
    const res = await fetch("/api/account/data", { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    setDialog(null);
    if (res.ok) {
      toast(
        `${data.dokumen_dihapus} ${t.dataDeletedA} ${data.sesi_dihapus} ${t.dataDeletedB}`,
        "success",
      );
      router.refresh();
    } else {
      toast(data.error ?? t.dataFailed, "error");
    }
  }

  async function hapusAkun() {
    setBusy(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      toast(t.accountDeleted, "success");
      router.push("/");
      router.refresh();
    } else {
      setBusy(false);
      setDialog(null);
      toast(t.accountFailed, "error");
    }
  }

  return (
    <div className="mt-10 border border-critique-rust/40 bg-critique-rust/5 p-6">
      <div className="flex items-center gap-2">
        <ShieldAlert size={20} strokeWidth={1.5} className="text-critique-rust" />
        <h2 className="font-display text-lg font-semibold text-ink-navy">
          {t.title}
        </h2>
      </div>
      <p className="mt-2 max-w-xl text-sm text-ink-gray">{t.intro}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={() => setDialog("data")}
          className="inline-flex items-center gap-2 border border-critique-rust px-4 py-2.5 text-sm text-critique-rust transition-colors hover:bg-critique-rust/10"
        >
          <Trash2 size={16} strokeWidth={1.5} />
          {t.deleteData}
        </button>
        <button
          onClick={() => setDialog("account")}
          className="inline-flex items-center gap-2 border border-critique-rust bg-critique-rust px-4 py-2.5 text-sm text-warm-paper transition-colors hover:bg-[#832f14]"
        >
          <Trash2 size={16} strokeWidth={1.5} />
          {t.deleteAccount}
        </button>
      </div>

      <ConfirmModal
        open={dialog === "data"}
        title={t.dataTitle}
        message={t.dataMessage}
        confirmLabel={t.dataConfirm}
        tone="danger"
        loading={busy}
        onConfirm={hapusData}
        onCancel={() => !busy && setDialog(null)}
      />
      <ConfirmModal
        open={dialog === "account"}
        title={t.accountTitle}
        message={t.accountMessage}
        confirmLabel={t.accountConfirm}
        tone="danger"
        loading={busy}
        onConfirm={hapusAkun}
        onCancel={() => !busy && setDialog(null)}
      />
    </div>
  );
}
