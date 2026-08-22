import { ButtonLink } from "@/components/ui/Button";
import { getDictionary } from "@/i18n/server";

export async function CtaPenutup() {
  const dict = await getDictionary();
  const t = dict.landing.cta;
  return (
    <section id="riset" className="border-b border-paper-line">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
          {t.eyebrow}
        </p>
        <h2 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight text-ink-navy sm:text-5xl">
          {t.title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-ink-gray">{t.subtitle}</p>
        <div className="mt-9 flex justify-center">
          <ButtonLink href="/daftar" variant="primary">
            {t.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
