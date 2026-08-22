"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";

import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function LanguageSwitcher() {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === locale) return;
    // Cookie is a UI preference (not httpOnly). One year, site-wide.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-gray">
        <Globe size={14} strokeWidth={1.5} />
        {dict.language.label}
      </p>
      <div className="mt-3 inline-flex overflow-hidden border border-paper-line">
        {LOCALES.map((loc) => (
          <button
            key={loc}
            onClick={() => change(loc)}
            disabled={pending}
            aria-pressed={loc === locale}
            className={`px-4 py-2 text-sm transition-colors disabled:opacity-60 ${
              loc === locale
                ? "bg-ink-navy text-warm-paper"
                : "bg-warm-paper text-ink-navy hover:bg-paper-soft"
            }`}
          >
            {dict.language[loc]}
          </button>
        ))}
      </div>
      <p className="mt-2 max-w-sm text-xs text-ink-gray">{dict.language.hint}</p>
    </div>
  );
}
