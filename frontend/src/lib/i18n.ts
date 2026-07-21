import "server-only"
import { cookies, headers } from "next/headers"
import { type Locale, LOCALES, DEFAULT_LOCALE, isLocale } from "@/lib/routes"

export { type Locale, LOCALES, DEFAULT_LOCALE, isLocale }

export const LOCALE_COOKIE = "locale"

export async function getLocale(): Promise<Locale> {
  // Migrated routes: the i18n middleware sets x-locale from the URL. This takes
  // precedence so the root layout's <html lang> matches the URL, not the cookie.
  const hdrs = await headers()
  const fromHeader = hdrs.get("x-locale")
  if (fromHeader && isLocale(fromHeader)) return fromHeader

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
