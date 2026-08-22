import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AnswerSuggestions } from "@/components/session/AnswerSuggestions";
import { CompetitionOutcome } from "@/components/session/CompetitionOutcome";
import { ScorecardView } from "@/components/session/ScorecardView";
import { backendFetch } from "@/lib/api";
import { getCurrentUser, getToken } from "@/lib/auth";
import { getDictionary } from "@/i18n/server";

export default async function ScorecardPage({
  params,
}: PageProps<"/session/[id]/scorecard">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const token = await getToken();
  const dict = await getDictionary();

  const [scRes, sessRes, outcomeRes] = await Promise.all([
    backendFetch(`/sessions/${id}/scorecard`, { token }),
    backendFetch(`/sessions/${id}`, { token }),
    backendFetch(`/sessions/${id}/outcome`, { token }),
  ]);

  if (!scRes.ok) {
    return (
      <main className="min-h-screen bg-warm-paper">
        <div className="mx-auto max-w-3xl px-8 py-12">
          <BackLink label={dict.scorecard.backHome} />
          <p className="mt-8 border border-paper-line bg-paper-soft p-8 text-ink-gray">
            {dict.scorecard.notReady}
          </p>
        </div>
      </main>
    );
  }

  const scorecard = await scRes.json();
  const sess = sessRes.ok ? await sessRes.json() : null;
  const outcome = outcomeRes.ok ? await outcomeRes.json() : null;

  return (
    <main className="min-h-screen bg-warm-paper">
      <div className="mx-auto max-w-3xl px-8 pt-8 print:hidden">
        <BackLink label={dict.scorecard.backHome} />
      </div>
      <ScorecardView
        scorecard={scorecard}
        documentId={sess?.document_id ?? null}
        sessionId={id}
      />
      <div className="mx-auto max-w-3xl px-8 pb-12">
        <AnswerSuggestions sessionId={id} />
        <CompetitionOutcome
          sessionId={id}
          initialOutcome={outcome}
          jenis={sess?.jenis ?? "kompetisi"}
        />
      </div>
    </main>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-2 text-sm text-ink-gray hover:text-ink-navy"
    >
      <ArrowLeft size={16} strokeWidth={1.5} />
      {label}
    </Link>
  );
}
