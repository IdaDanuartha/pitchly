"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/client";

export function CheckoutButton({
  planId,
  interval,
  gratis,
}: {
  planId: string;
  interval: "monthly" | "yearly";
  gratis: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { dict } = useI18n();
  const t = dict.billing;
  const [busy, setBusy] = useState(false);

  async function bayar() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, interval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? t.payFailed);
      toast(
        gratis
          ? t.switchedFree
          : `${t.paymentSuccessA} ${planId.toUpperCase()} ${t.paymentSuccessB}`,
        "success",
      );
      router.push("/dashboard/subscription");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : t.genericError, "error");
      setBusy(false);
    }
  }

  return (
    <button
      onClick={bayar}
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2 border border-spotlight-amber bg-spotlight-amber px-5 py-3 text-sm font-medium text-warm-paper transition-colors hover:bg-[#a06a15] disabled:opacity-60"
    >
      {busy ? (
        <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
      ) : (
        <CreditCard size={16} strokeWidth={1.5} />
      )}
      {gratis ? t.activateFree : t.payNow}
    </button>
  );
}
