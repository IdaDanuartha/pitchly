"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";

import { formatRupiah, type Billing, type Plan } from "@/lib/billing";
import { useI18n } from "@/i18n/client";

export function Subscription({
  plans,
  billing,
}: {
  plans: Plan[];
  billing: Billing | null;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.billing;
  const [interval, setIntervalState] = useState<"monthly" | "yearly">("monthly");

  const currentPlan = billing?.plan ?? "free";

  function pilih(planId: string) {
    router.push(
      `/dashboard/subscription/checkout?plan=${planId}&interval=${interval}`,
    );
  }

  return (
    <div className="mt-8">
      {/* Interval toggle */}
      <div className="inline-flex border border-paper-line">
        {(["monthly", "yearly"] as const).map((iv) => (
          <button
            key={iv}
            onClick={() => setIntervalState(iv)}
            className={`px-4 py-2 text-sm transition-colors ${
              interval === iv
                ? "bg-ink-navy text-warm-paper"
                : "text-ink-gray hover:text-ink-navy"
            }`}
          >
            {iv === "monthly" ? t.monthly : t.yearly}
            {iv === "yearly" && (
              <span className="ml-1.5 text-xs text-spotlight-amber">{t.saveBadge}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {plans.map((p) => {
          const harga = interval === "yearly" ? p.harga_tahunan : p.harga_bulanan;
          const isCurrent = currentPlan === p.id;
          const featured = p.id === "pro";
          return (
            <div
              key={p.id}
              className={`flex flex-col border p-6 ${
                featured
                  ? "border-spotlight-amber bg-paper-soft"
                  : "border-paper-line bg-paper-soft"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-ink-navy">
                  {p.nama}
                </h2>
                {isCurrent && (
                  <span className="border border-growth-teal px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-growth-teal">
                    {t.active}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-gray">{p.deskripsi}</p>

              {interval === "yearly" && harga > 0 && (
                <p className="mt-4 font-mono text-sm text-ink-gray">
                  <span className="line-through">
                    {formatRupiah(p.harga_bulanan * 12)}
                  </span>
                  <span className="ml-2 text-spotlight-amber">{t.save17}</span>
                </p>
              )}
              <p
                className={`font-mono text-3xl font-medium text-ink-navy tabular-nums ${
                  interval === "yearly" && harga > 0 ? "mt-1" : "mt-4"
                }`}
              >
                {harga === 0 ? t.free : formatRupiah(harga)}
                {harga > 0 && (
                  <span className="text-sm text-ink-gray">
                    /{interval === "yearly" ? t.perYear : t.perMonth}
                  </span>
                )}
              </p>

              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {p.fitur.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-navy">
                    <Check
                      size={16}
                      strokeWidth={1.5}
                      className="mt-0.5 shrink-0 text-growth-teal"
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => pilih(p.id)}
                disabled={isCurrent}
                className={`mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  featured
                    ? "border border-spotlight-amber bg-spotlight-amber text-warm-paper hover:bg-[#a06a15]"
                    : "border border-ink-navy/25 text-ink-navy hover:border-ink-navy/60"
                }`}
              >
                {isCurrent
                  ? t.activePlanBtn
                  : p.id === "free"
                    ? t.downgradeFree
                    : t.choosePlan}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-ink-gray">{t.demoNote}</p>
    </div>
  );
}
