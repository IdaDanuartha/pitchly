// Cookie-based locale (no [lang] route segments — the app lives behind auth,
// so URL-embedded locales add churn without benefit).
export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "id";
export const LOCALE_COOKIE = "pitchly_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export const LOCALE_LABEL: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};
