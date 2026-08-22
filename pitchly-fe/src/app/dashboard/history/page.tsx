import { ScoreTrend } from "@/components/dashboard/ScoreTrend";
import { SessionHistoryTable } from "@/components/dashboard/SessionHistoryTable";
import { ButtonLink } from "@/components/ui/Button";
import { fetchSessions } from "@/lib/sessions";
import { getDictionary } from "@/i18n/server";

export default async function RiwayatPage() {
  const sessions = await fetchSessions();
  const t = (await getDictionary()).riwayat;

  // Chronological average scores for the trend (oldest → newest).
  const trend = [...sessions]
    .reverse()
    .filter((s) => s.skor_rata_rata != null)
    .map((s) => s.skor_rata_rata as number);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
        {t.eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-navy">
        {t.heading}
      </h1>

      {sessions.length === 0 ? (
        <div className="mt-10 flex flex-col items-start gap-4 border border-paper-line bg-paper-soft p-8">
          <p className="text-sm text-ink-gray">{t.empty}</p>
          <ButtonLink href="/dashboard/new-session" variant="primary">
            {t.startNew}
          </ButtonLink>
        </div>
      ) : (
        <>
          {trend.length >= 2 && (
            <div className="mt-8">
              <h2 className="mb-3 font-display text-lg font-semibold text-ink-navy">
                {t.scoreTrend}
              </h2>
              <ScoreTrend scores={trend} ariaLabel={t.scoreTrendAria} />
            </div>
          )}

          <SessionHistoryTable initialSessions={sessions} />
        </>
      )}
    </div>
  );
}

