"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

type Step = "dokumen" | "rubrik" | "ringkasan" | "menganalisis";

// Keep in sync with backend settings.max_upload_mb.
const MAX_UPLOAD_MB = 20;

export default function SesiBaruPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.sesiBaru;
  const [step, setStep] = useState<Step>("dokumen");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [namaKompetisi, setNamaKompetisi] = useState("");
  const [rubrikFile, setRubrikFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function mulaiAnalisis() {
    setError(null);
    if (!docFile) {
      setError(t.errDocRequired);
      return;
    }
    if (docFile.type && docFile.type !== "application/pdf") {
      setError(t.errPdfOnly);
      return;
    }
    if (docFile.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`${t.errTooLarge} ${MAX_UPLOAD_MB} MB`);
      return;
    }
    setStep("menganalisis");

    try {
      // 1. Upload document.
      const docForm = new FormData();
      docForm.append("file", docFile);
      docForm.append("tipe", "proposal");
      const docRes = await fetch("/api/documents", {
        method: "POST",
        body: docForm,
      });
      const doc = await docRes.json();
      if (!docRes.ok)
        throw new Error(doc.detail ?? doc.error ?? t.errUploadFailed);

      // 2. Upload rubric (optional file, name required).
      if (namaKompetisi.trim()) {
        const rubForm = new FormData();
        rubForm.append("nama_kompetisi", namaKompetisi.trim());
        if (rubrikFile) rubForm.append("file", rubrikFile);
        await fetch("/api/rubrics", { method: "POST", body: rubForm });
      }

      // 3. Trigger analysis.
      const anaRes = await fetch(`/api/documents/${doc.id}/analyze`, {
        method: "POST",
      });
      const ana = await anaRes.json();
      if (!anaRes.ok) throw new Error(ana.detail ?? ana.error ?? t.errAnalyzeFailed);

      router.push(`/dashboard/documents/${doc.id}/analysis`);
    } catch (e) {
      setStep("ringkasan");
      setError(e instanceof Error ? e.message : dict.common.error);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-gray">
        {t.eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-navy">
        {t.heading}
      </h1>

      <StepIndicator step={step} />

      <div className="mt-8">
        {step === "dokumen" && (
          <StepCard title={t.step1Title} desc={t.step1Desc}>
            <FileDrop
              file={docFile}
              onFile={setDocFile}
              accept="application/pdf"
              hint={t.dropHint}
              replaceLabel={t.clickToReplace}
            />
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => docFile && setStep("rubrik")}
                disabled={!docFile}
              >
                {t.next}
              </Button>
            </div>
          </StepCard>
        )}

        {step === "rubrik" && (
          <StepCard title={t.step2Title} desc={t.step2Desc}>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
                {t.namaKompetisi}
              </span>
              <input
                value={namaKompetisi}
                onChange={(e) => setNamaKompetisi(e.target.value)}
                placeholder={t.namaKompetisiPlaceholder}
                className="border border-ink-navy/20 bg-warm-paper px-3 py-2.5 text-sm text-ink-navy placeholder:text-ink-gray/50 focus:border-ink-navy focus:outline-none"
              />
            </label>
            <div className="mt-4">
              <FileDrop
                file={rubrikFile}
                onFile={setRubrikFile}
                accept="application/pdf"
                hint={t.rubrikHint}
                replaceLabel={t.clickToReplace}
              />
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="secondary" onClick={() => setStep("dokumen")}>
                {t.back}
              </Button>
              <Button onClick={() => setStep("ringkasan")}>{t.next}</Button>
            </div>
          </StepCard>
        )}

        {(step === "ringkasan" || step === "menganalisis") && (
          <StepCard title={t.step3Title} desc={t.step3Desc}>
            <dl className="divide-y divide-paper-line border-y border-paper-line">
              <Row label={t.rowDokumen} value={docFile?.name ?? "—"} />
              <Row label={t.rowKompetisi} value={namaKompetisi || t.templateUmum} />
              <Row label={t.rowPedoman} value={rubrikFile?.name ?? t.notUploaded} />
              <Row label={t.rowMode} value={t.modeValue} />
            </dl>

            {error && (
              <p className="mt-4 border-l-2 border-critique-rust bg-critique-rust/8 px-3 py-2 text-sm text-critique-rust">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-between">
              <Button
                variant="secondary"
                onClick={() => setStep("rubrik")}
                disabled={step === "menganalisis"}
              >
                {t.back}
              </Button>
              <Button onClick={mulaiAnalisis} disabled={step === "menganalisis"}>
                {step === "menganalisis" ? (
                  <>
                    <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                    {t.analyzing}
                  </>
                ) : (
                  t.startAnalysis
                )}
              </Button>
            </div>
          </StepCard>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const order: Step[] = ["dokumen", "rubrik", "ringkasan"];
  const activeIdx = step === "menganalisis" ? 2 : order.indexOf(step);
  return (
    <div className="mt-8 flex gap-2">
      {order.map((s, i) => (
        <div
          key={s}
          className={`h-1 flex-1 ${
            i <= activeIdx ? "bg-spotlight-amber" : "bg-paper-line"
          }`}
        />
      ))}
    </div>
  );
}

function StepCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-paper-line bg-paper-soft p-8">
      <h2 className="font-display text-xl font-semibold text-ink-navy">{title}</h2>
      <p className="mt-1 text-sm text-ink-gray">{desc}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
        {label}
      </dt>
      <dd className="text-sm text-ink-navy">{value}</dd>
    </div>
  );
}

function FileDrop({
  file,
  onFile,
  accept,
  hint,
  replaceLabel,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  accept: string;
  hint: string;
  replaceLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed px-6 py-10 text-center transition-colors ${
        dragging
          ? "border-spotlight-amber bg-spotlight-amber/5"
          : "border-ink-navy/25 bg-warm-paper hover:border-ink-navy/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <>
          <CheckCircle2 size={24} strokeWidth={1.5} className="text-growth-teal" />
          <span className="text-sm text-ink-navy">{file.name}</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
            {replaceLabel}
          </span>
        </>
      ) : (
        <>
          {dragging ? (
            <UploadCloud size={24} strokeWidth={1.5} className="text-spotlight-amber" />
          ) : (
            <FileUp size={24} strokeWidth={1.5} className="text-ink-gray" />
          )}
          <span className="text-sm text-ink-gray">{hint}</span>
        </>
      )}
    </div>
  );
}
