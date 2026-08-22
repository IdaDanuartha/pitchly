"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const confirmCls =
    tone === "danger"
      ? "border-critique-rust bg-critique-rust text-warm-paper hover:bg-[#832f14]"
      : "border-spotlight-amber bg-spotlight-amber text-warm-paper hover:bg-[#a06a15]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-navy/60 px-4"
      onClick={() => !loading && onCancel()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md border border-paper-line bg-warm-paper p-6 shadow-[0_24px_60px_-30px_rgba(14,20,32,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-semibold text-ink-navy">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-gray">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="border border-ink-navy/25 px-4 py-2.5 text-sm text-ink-navy transition-colors hover:border-ink-navy/60 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${confirmCls}`}
          >
            {loading && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
