"use client";

import { useI18n } from "@/i18n/client";

const STYLE: Record<string, string> = {
  selesai: "border-growth-teal text-growth-teal",
  active: "border-spotlight-amber text-spotlight-amber",
  menunggu_scorecard: "border-spotlight-amber text-spotlight-amber",
  draft: "border-ink-gray text-ink-gray",
};

export function StatusChip({ status }: { status: string }) {
  const { dict } = useI18n();
  const label = (dict.status as Record<string, string>)[status] ?? status;
  return (
    <span
      className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${
        STYLE[status] ?? "border-ink-gray text-ink-gray"
      }`}
    >
      {label}
    </span>
  );
}
