import Link from "next/link";
import { ArrowLeft, Cpu, Lightbulb, Target } from "lucide-react";

import { StartSimulationButton } from "@/components/session/StartSimulationButton";
import { OriginalityCheck } from "@/components/session/OriginalityCheck";
import { backendFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getDictionary } from "@/i18n/server";

type Finding = {
  bagian: "problem_statement" | "kelayakan_teknis" | "dampak";
  temuan: string;
  rujukan: string;
  severity: "rendah" | "sedang" | "tinggi";
  kutipan?: string | null;
  halaman?: number | null;
};

type Analysis = {
  findings: Finding[];
  model_used: string;
};

const BAGIAN_ICON = {
  problem_statement: Target,
  kelayakan_teknis: Cpu,
  dampak: Lightbulb,
} as const;

const SEVERITY_STYLE: Record<Finding["severity"], string> = {
  tinggi: "border-critique-rust text-critique-rust",
  sedang: "border-spotlight-amber text-spotlight-amber",
  rendah: "border-ink-gray text-ink-gray",
};

export default async function AnalisisPage({
  params,
}: PageProps<"/dashboard/documents/[id]/analysis">) {
  const { id } = await params;
  const token = await getToken();
  const t = (await getDictionary()).analisis;
  const res = await backendFetch(`/documents/${id}/analysis`, { token });

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <BackLink label={t.back} />
        <p className="mt-8 border border-paper-line bg-paper-soft p-8 text-ink-gray">
          {t.notAvailable}
        </p>
      </div>
    );
  }

  const data = (await res.json()) as Analysis;
  const grouped = groupByBagian(data.findings);
  const bagianLabel: Record<Finding["bagian"], string> = {
    problem_statement: t.problemStatement,
    kelayakan_teknis: t.kelayakanTeknis,
    dampak: t.dampak,
  };

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <BackLink label={t.back} />
      <p className="mt-6 font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
        {t.eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-navy">
        {data.findings.length} {t.headingSuffix}
      </h1>
      <p className="mt-2 text-sm text-ink-gray">
        {t.introA}{" "}
        <span className="font-mono">{data.model_used}</span>.
      </p>

      <div className="mt-10 flex flex-col gap-10">
        {(Object.keys(grouped) as Finding["bagian"][]).map((bagian) => {
          const Icon = BAGIAN_ICON[bagian];
          const items = grouped[bagian];
          if (!items.length) return null;
          return (
            <section key={bagian}>
              <div className="flex items-center gap-2 border-b border-paper-line pb-3">
                <Icon size={20} strokeWidth={1.5} className="text-ink-navy" />
                <h2 className="font-display text-lg font-semibold text-ink-navy">
                  {bagianLabel[bagian]}
                </h2>
                <span className="font-mono text-xs text-ink-gray">
                  ({items.length})
                </span>
              </div>
              <ul className="mt-4 flex flex-col gap-4">
                {items.map((f, i) => (
                  <li key={i} className="border border-paper-line bg-paper-soft p-5">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-ink-navy">{f.temuan}</p>
                      <span
                        className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${SEVERITY_STYLE[f.severity]}`}
                      >
                        {t.severity[f.severity]}
                      </span>
                    </div>
                    {f.kutipan ? (
                      <blockquote className="mt-3 border-l-2 border-spotlight-amber pl-3">
                        <p className="text-sm italic text-ink-navy">
                          &ldquo;{f.kutipan}&rdquo;
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-gray">
                          {f.rujukan}
                          {f.halaman ? ` · ${t.halaman} ${f.halaman}` : ""}
                        </p>
                      </blockquote>
                    ) : (
                      <p className="mt-3 border-l-2 border-ink-gray/40 pl-3 text-sm italic text-ink-gray">
                        {f.rujukan}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <OriginalityCheck documentId={id} />

      <div className="mt-12 border-t border-paper-line pt-8">
        <p className="mb-5 max-w-lg text-sm text-ink-gray">{t.ctaBody}</p>
        <StartSimulationButton documentId={id} />
      </div>
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href="/dashboard/new-session"
      className="inline-flex items-center gap-2 text-sm text-ink-gray hover:text-ink-navy"
    >
      <ArrowLeft size={16} strokeWidth={1.5} />
      {label}
    </Link>
  );
}

function groupByBagian(findings: Finding[]): Record<Finding["bagian"], Finding[]> {
  const out: Record<Finding["bagian"], Finding[]> = {
    problem_statement: [],
    kelayakan_teknis: [],
    dampak: [],
  };
  for (const f of findings) out[f.bagian]?.push(f);
  return out;
}
