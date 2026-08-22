import { RubricLibrary } from "@/components/dashboard/RubricLibrary";
import { fetchRubrics } from "@/lib/rubrics";
import { getDictionary } from "@/i18n/server";

export default async function RubrikPage() {
  const rubrics = await fetchRubrics();
  const t = (await getDictionary()).rubrics;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
        {t.eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-navy">
        {t.heading}
      </h1>
      <p className="mt-2 text-ink-gray">{t.subtitle}</p>
      <RubricLibrary initial={rubrics} />
    </div>
  );
}
