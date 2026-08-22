"use client";

import { useState } from "react";
import { SlidersHorizontal, Trash2 } from "lucide-react";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Rubric } from "@/lib/rubrics";
import { useI18n } from "@/i18n/client";

export function RubricLibrary({ initial }: { initial: Rubric[] }) {
  const { dict } = useI18n();
  const t = dict.rubrics;
  const [rubrics, setRubrics] = useState<Rubric[]>(initial);
  const [target, setTarget] = useState<Rubric | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!target) return;
    setDeleting(true);
    const res = await fetch(`/api/rubrics/${target.id}`, { method: "DELETE" });
    if (res.ok) setRubrics((prev) => prev.filter((r) => r.id !== target.id));
    setDeleting(false);
    setTarget(null);
  }

  if (rubrics.length === 0) {
    return (
      <p className="mt-8 border border-paper-line bg-paper-soft p-6 text-sm text-ink-gray">
        {t.empty}
      </p>
    );
  }

  return (
    <>
      <div className="mt-8 flex flex-col gap-4">
        {rubrics.map((r) => (
          <div key={r.id} className="border border-paper-line bg-paper-soft p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal
                  size={20}
                  strokeWidth={1.5}
                  className="text-ink-navy"
                />
                <h2 className="font-display text-lg font-semibold text-ink-navy">
                  {r.nama_kompetisi}
                </h2>
              </div>
              <button
                onClick={() => setTarget(r)}
                className="text-ink-gray transition-colors hover:text-critique-rust"
                aria-label={`Hapus ${r.nama_kompetisi}`}
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {r.kriteria_json.map((k) => (
                <span
                  key={k}
                  className="border border-paper-line bg-warm-paper px-2.5 py-1 text-xs text-ink-navy"
                >
                  {k}
                  {r.bobot_json?.[k] != null && (
                    <span className="ml-1.5 font-mono text-ink-gray">
                      {r.bobot_json[k]}%
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={target !== null}
        title={t.deleteTitle}
        message={`${t.deleteMessageA} "${target?.nama_kompetisi ?? ""}" ${t.deleteMessageB}`}
        confirmLabel={t.deleteConfirm}
        tone="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setTarget(null)}
      />
    </>
  );
}
