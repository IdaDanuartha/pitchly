import { Construction } from "lucide-react";

export function ComingSoon({ judul, body }: { judul: string; body: string }) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="flex flex-col items-start gap-4 border border-paper-line bg-paper-soft p-10">
        <Construction size={24} strokeWidth={1.5} className="text-ink-gray" />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-navy">
          {judul}
        </h1>
        <p className="max-w-lg text-sm text-ink-gray">{body}</p>
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-spotlight-amber">
          Segera hadir
        </span>
      </div>
    </div>
  );
}
