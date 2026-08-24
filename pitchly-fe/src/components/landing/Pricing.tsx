"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";

import { formatRupiah, type Plan } from "@/lib/billing";
import { useI18n } from "@/i18n/client";
import { ScrollReveal } from "./ScrollReveal";

export function Pricing({ plans }: { plans: Plan[] }) {
  const { dict } = useI18n();
  const t = dict.landing.harga;
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  if (!plans.length) return null;

  return (
    <section id="harga" className="border-t border-paper-line bg-warm-paper py-24">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal variant="up">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
            {t.eyebrow}
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink-navy sm:text-4xl">
            {t.title}
          </h2>
          <p className="mt-3 max-w-xl text-ink-gray">{t.subtitle}</p>
        </ScrollReveal>

        <div className="mt-8 inline-flex border border-paper-line">
          {(["monthly", "yearly"] as const).map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={`px-4 py-2 text-sm transition-colors ${
                interval === iv
                  ? "bg-ink-navy text-warm-paper"
                  : "text-ink-gray hover:text-ink-navy"
              }`}
            >
              {iv === "monthly" ? t.monthly : t.yearly}
              {iv === "yearly" && (
                <span className="ml-1.5 text-xs text-spotlight-amber">
                  {t.saveBadge}
                </span>
              )}
            </button>
          ))}
        </div>

        <ScrollReveal variant="up" delay={0.1} stagger staggerDelay={0.1} className="mt-8 grid gap-5 lg:grid-cols-3">
          {plans.map((p) => {
            const harga = interval === "yearly" ? p.harga_tahunan : p.harga_bulanan;
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
                {featured && (
                  <span className="mb-3 w-fit border border-spotlight-amber px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-spotlight-amber">
                    {t.popular}
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold text-ink-navy">
                  {p.nama}
                </h3>
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
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-ink-navy"
                    >
                      <Check
                        size={16}
                        strokeWidth={1.5}
                        className="mt-0.5 shrink-0 text-growth-teal"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={
                    p.id === "free"
                      ? "/register"
                      : `/dashboard/subscription/checkout?plan=${p.id}&interval=${interval}`
                  }
                  className={`mt-6 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium transition-colors ${
                    featured
                      ? "border border-spotlight-amber bg-spotlight-amber text-warm-paper hover:bg-[#a06a15]"
                      : "border border-ink-navy/25 text-ink-navy hover:border-ink-navy/60"
                  }`}
                >
                  {p.id === "free" ? t.startFree : `${t.choose} ${p.nama}`}
                </Link>
              </div>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
