import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { id } from "./dictionaries/id";
import { en } from "./dictionaries/en";

const DICTS = { id, en } as const;

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Server-side dictionary for the current (or given) locale. */
export async function getDictionary(locale?: Locale) {
  return DICTS[locale ?? (await getLocale())];
}
