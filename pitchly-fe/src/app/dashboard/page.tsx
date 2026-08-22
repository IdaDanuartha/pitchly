import Link from "next/link";
import { ArrowRight, FileCheck2, Gauge, Loader } from "lucide-react";

import { RecurringWeakness } from "@/components/dashboard/RecurringWeakness";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/i18n/server";
import {
  fetchInsights,
  fetchOverview,
  fetchSessions,
  formatTanggal,
  sessionHref,
} from "@/lib/sessions";

export default async function DashboardHome() {
  const [user, overview, sessions, insights, dict] = await Promise.all([
    getCurrentUser(),
    fetchOverview(),
    fetchSessions(),
    fetchInsights(),
    getDictionary(),
  ]);
  const t = dict.dashboard;
  const terakhir = sessions.slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
        {t.eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-navy">
        {t.welcome} {user?.nama}.
      </h1>
      <p className="mt-2 text-ink-gray">{t.subtitle}</p>

      <div className="mt-10 grid gap-px overflow-hidden border border-paper-line bg-paper-line sm:grid-cols-3">
        <StatCard
          icon={FileCheck2}
          label={t.statDone}
          value={String(overview.sesi_selesai)}
        />
        <StatCard
          icon={Gauge}
          label={t.statLastScore}
          value={overview.skor_terakhir != null ? String(overview.skor_terakhir) : "—"}
        />
        <StatCard
          icon={Loader}
          label={t.statDocs}
          value={String(overview.dokumen_dianalisis)}
        />
      </div>

      <div className="mt-10 flex flex-col items-start gap-5 border border-paper-line bg-paper-soft p-8">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-navy">
            {t.ctaTitle}
          </h2>
          <p className="mt-2 max-w-lg text-sm text-ink-gray">{t.ctaBody}</p>
        </div>
        <ButtonLink href="/dashboard/sesi-baru" variant="primary">
          {t.ctaButton}
          <ArrowRight size={16} strokeWidth={1.5} />
        </ButtonLink>
      </div>

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold text-ink-navy">
            {t.recentTitle}
          </h2>
          {sessions.length > 5 && (
            <Link
              href="/dashboard/riwayat"
              className="text-sm text-spotlight-amber hover:underline"
            >
              {t.viewAll}
            </Link>
          )}
        </div>

        {terakhir.length === 0 ? (
          <p className="mt-4 border border-paper-line bg-paper-soft p-6 text-sm text-ink-gray">
            {t.noSessions}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-paper-line border-y border-paper-line">
            {terakhir.map((s) => (
              <li key={s.id}>
                <Link
                  href={sessionHref(s)}
                  className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-paper-soft"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink-navy">
                      {s.nama_kompetisi}
                    </p>
                    <p className="truncate font-mono text-[11px] text-ink-gray">
                      {s.document_filename ?? "—"} · {formatTanggal(s.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {s.skor_rata_rata != null && (
                      <span className="font-mono text-sm text-ink-navy tabular-nums">
                        {s.skor_rata_rata}
                      </span>
                    )}
                    <StatusChip status={s.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {insights.cukup_data && (
        <RecurringWeakness
          kategori={insights.kategori}
          totalSesi={insights.total_sesi_dinilai}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileCheck2;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-warm-paper p-6">
      <Icon size={20} strokeWidth={1.5} className="text-ink-gray" />
      <p className="mt-4 font-mono text-3xl font-medium text-ink-navy tabular-nums">
        {value}
      </p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
        {label}
      </p>
    </div>
  );
}
