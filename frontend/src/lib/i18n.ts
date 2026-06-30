import "server-only"
import { cookies } from "next/headers"

export type Locale = "es" | "en"
export const LOCALES: Locale[] = ["es", "en"]
export const DEFAULT_LOCALE: Locale = "es"
export const LOCALE_COOKIE = "locale"

export function isLocale(v: string): v is Locale {
  return LOCALES.includes(v as Locale)
}

export async function getLocale(): Promise<Locale> {
  const jar = await cookies()
  const val = jar.get(LOCALE_COOKIE)?.value
  return val && isLocale(val) ? val : DEFAULT_LOCALE
}

const dictionaries = {
  es: () =>
    import("@/dictionaries/es.json").then((m) => m.default),
  en: () =>
    import("@/dictionaries/en.json").then((m) => m.default),
}

export async function getDictionary(locale: Locale) {
  return dictionaries[locale]()
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
