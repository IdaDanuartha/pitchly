import { TeamManager } from "@/components/dashboard/TeamManager";
import { fetchTeams } from "@/lib/teams";
import { getDictionary } from "@/i18n/server";

export default async function TimPage() {
  const teams = await fetchTeams();
  const t = (await getDictionary()).teams;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
        {t.eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-navy">
        {t.heading}
      </h1>
      <p className="mt-2 mb-8 text-ink-gray">{t.subtitle}</p>
      <TeamManager initialTeams={teams} />
    </div>
  );
}
