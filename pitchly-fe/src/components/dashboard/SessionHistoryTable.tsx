"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import { StatusChip } from "@/components/dashboard/StatusChip";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { SessionListItem } from "@/lib/sessions";
import { useI18n } from "@/i18n/client";

function sessionHref(s: { id: string; status: string }): string {
  return s.status === "selesai" ? `/sesi/${s.id}/scorecard` : `/sesi/${s.id}`;
}

export function SessionHistoryTable({
  initialSessions,
}: {
  initialSessions: SessionListItem[];
}) {
  const { locale, dict } = useI18n();
  const t = dict.history;
  const formatTanggal = (iso: string): string =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const [sessions, setSessions] = useState<SessionListItem[]>(initialSessions);
  const [targetSession, setTargetSession] = useState<SessionListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  // Keep the page in range when deletions shrink the list.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageSessions = sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function confirmDeleteSession() {
    if (!targetSession) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${targetSession.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== targetSession.id));
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
      setTargetSession(null);
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="mt-10 border border-paper-line bg-paper-soft p-8 text-sm text-ink-gray">
        {t.empty}
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 overflow-x-auto border border-paper-line">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-paper-line bg-paper-soft text-left">
              <Th>{t.thDate}</Th>
              <Th>{t.thCompetition}</Th>
              <Th>{t.thDocument}</Th>
              <Th>{t.thMode}</Th>
              <Th>{t.thStatus}</Th>
              <Th className="text-right">{t.thScore}</Th>
              <Th className="text-right">{t.thAction}</Th>
            </tr>
          </thead>
          <tbody>
            {pageSessions.map((s) => (
              <tr
                key={s.id}
                className="border-b border-paper-line last:border-0 hover:bg-paper-soft"
              >
                <Td>
                  <Link href={sessionHref(s)} className="block hover:underline">
                    {formatTanggal(s.created_at)}
                  </Link>
                </Td>
                <Td>{s.nama_kompetisi}</Td>
                <Td className="max-w-[180px] truncate font-mono text-[12px] text-ink-gray">
                  {s.document_filename ?? "—"}
                </Td>
                <Td className="capitalize">{s.mode}</Td>
                <Td>
                  <StatusChip status={s.status} />
                </Td>
                <Td className="text-right font-mono tabular-nums">
                  {s.skor_rata_rata ?? "—"}
                </Td>
                <Td className="text-right">
                  <button
                    onClick={() => setTargetSession(s)}
                    className="text-ink-gray transition-colors hover:text-critique-rust"
                    aria-label={`${t.deleteSession} ${s.nama_kompetisi}`}
                    title={t.deleteSession}
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
            {t.page} {page} / {totalPages} · {sessions.length} {t.sessions}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 border border-paper-line px-3 py-1.5 text-sm text-ink-navy transition-colors hover:border-ink-navy/50 disabled:opacity-40"
            >
              <ChevronLeft size={16} strokeWidth={1.5} />
              {t.prev}
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 border border-paper-line px-3 py-1.5 text-sm text-ink-navy transition-colors hover:border-ink-navy/50 disabled:opacity-40"
            >
              {t.next}
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={targetSession !== null}
        title={t.confirmTitle}
        message={`${t.confirmMessageA} "${targetSession?.nama_kompetisi ?? ""}" (${
          targetSession ? formatTanggal(targetSession.created_at) : ""
        }) ${t.confirmMessageB}`}
        confirmLabel={t.confirmLabel}
        tone="danger"
        loading={deleting}
        onConfirm={confirmDeleteSession}
        onCancel={() => !deleting && setTargetSession(null)}
      />
    </>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-ink-gray ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 text-ink-navy ${className}`}>{children}</td>;
}
