import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { CheckoutButton } from "@/components/dashboard/CheckoutButton";
import { formatRupiah } from "@/lib/billing";
import { fetchPlans } from "@/lib/billing.server";
import { getDictionary } from "@/i18n/server";

export default async function CheckoutPage({
  searchParams,
}: PageProps<"/dashboard/subscription/checkout">) {
  const sp = await searchParams;
  const planId = typeof sp.plan === "string" ? sp.plan : "pro";
  const interval: "monthly" | "yearly" =
    sp.interval === "yearly" ? "yearly" : "monthly";

  const plans = await fetchPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) redirect("/dashboard/subscription");

  const t = (await getDictionary()).billing;
  const harga = interval === "yearly" ? plan.harga_tahunan : plan.harga_bulanan;
  const gratis = harga === 0;

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <Link
        href="/dashboard/subscription"
        className="inline-flex items-center gap-2 text-sm text-ink-gray hover:text-ink-navy"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        {t.backToPlans}
      </Link>

      <p className="mt-6 font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
        {t.checkoutEyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-navy">
        {t.checkoutHeading}
      </h1>

      <div className="mt-8 border border-paper-line bg-paper-soft p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-navy">
              {t.paket} {plan.nama}
            </h2>
            <p className="mt-1 text-sm text-ink-gray">{plan.deskripsi}</p>
          </div>
          <span className="border border-ink-navy/20 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
            {interval === "yearly" ? t.yearly : t.monthly}
          </span>
        </div>

        <ul className="mt-5 flex flex-col gap-2.5 border-t border-paper-line pt-5">
          {plan.fitur.map((f) => (
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

        <div className="mt-6 flex items-baseline justify-between border-t border-paper-line pt-5">
          <span className="text-sm text-ink-gray">{t.total}</span>
          <span className="font-mono text-3xl font-medium text-ink-navy tabular-nums">
            {gratis ? t.free : formatRupiah(harga)}
            {harga > 0 && (
              <span className="text-sm text-ink-gray">
                /{interval === "yearly" ? t.perYear : t.perMonth}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <CheckoutButton planId={plan.id} interval={interval} gratis={gratis} />
        <p className="mt-3 text-center text-xs text-ink-gray">
          {t.checkoutDemoNote}
        </p>
      </div>
    </div>
  );
}
