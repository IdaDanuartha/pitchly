import { Langganan } from "@/components/dashboard/Langganan";
import { fetchBilling, fetchPlans } from "@/lib/billing.server";
import { getDictionary } from "@/i18n/server";

export default async function LanggananPage() {
  const [plans, billing] = await Promise.all([fetchPlans(), fetchBilling()]);
  const t = (await getDictionary()).billing;

  const kuota = billing?.usage.sesi_kuota;
  const dipakai = billing?.usage.sesi_dipakai ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
        {t.eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-navy">
        {t.heading}
      </h1>
      <p className="mt-2 text-ink-gray">
        {t.activePlan}{" "}
        <span className="font-medium text-ink-navy uppercase">
          {billing?.plan ?? "free"}
        </span>
        {kuota != null && (
          <>
            {" · "}
            {t.sessionsUsed} {dipakai}/{kuota}
          </>
        )}
      </p>

      <Langganan plans={plans} billing={billing} />
    </div>
  );
}
