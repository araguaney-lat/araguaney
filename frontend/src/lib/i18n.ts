import "server-only"
import { cookies, headers } from "next/headers"
import { type Locale, LOCALES, DEFAULT_LOCALE, isLocale, resolveLocale } from "@/lib/routes"

export { type Locale, LOCALES, DEFAULT_LOCALE, isLocale, resolveLocale }

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

/* Acepta `string` y no `Locale` a propósito.
 *
 * Lo llaman los `generateMetadata` de las páginas bajo `[lang]`, que reciben el
 * segmento tal cual viene de la URL. Tipar ese parámetro como `Locale` describe
 * un deseo, no la realidad: `/favicon.svg` llega aquí como idioma. Ver
 * `resolveLocale` en `@/lib/routes`. */
export async function getDictionary(locale: string) {
  return dictionaries[resolveLocale(locale)]()
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
