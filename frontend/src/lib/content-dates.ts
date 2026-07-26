import type { Locale, RouteKey } from "@/lib/routes"
import { FOUNDER } from "@/lib/seo"

export interface ContentDates {
  /** ISO yyyy-mm-dd the page was first published. */
  published: string
  /** ISO yyyy-mm-dd of the last meaningful content refresh. */
  modified: string
}

// Single source of truth for Article/HowTo freshness dates. Bump `modified`
// whenever a page's content is meaningfully refreshed — pages not updated on a
// ~quarterly cadence lose AI citations at ~3x the normal rate, and Google shows
// the date in results. Keep the refresh cadence quarterly (Fase 17 task 15).
export const CONTENT_DATES: Partial<Record<RouteKey, ContentDates>> = {
  "guias/como-organizar-un-centro-de-acopio": { published: "2026-07-21", modified: "2026-07-24" },
  "guias/que-se-puede-donar": { published: "2026-07-21", modified: "2026-07-24" },
  "guias/como-preparar-carga-humanitaria-para-aduana": { published: "2026-07-21", modified: "2026-07-24" },
  "guias/como-registrar-voluntarios-en-un-centro-de-acopio": { published: "2026-07-21", modified: "2026-07-24" },
  "guias/software-gratis-para-gestionar-donaciones-ong": { published: "2026-07-21", modified: "2026-07-24" },
  "guias/sistema-de-inventario-para-damnificados": { published: "2026-07-21", modified: "2026-07-24" },
}

const MONTHS: Record<Locale, readonly string[]> = {
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
}

// Localized short date from an ISO yyyy-mm-dd. Parsed by hand (no `new Date`) so
// a date-only value never shifts across timezones during SSR.
export function formatContentDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split("-").map(Number)
  const month = MONTHS[locale][m - 1]
  return locale === "es" ? `${d} ${month} ${y}` : `${month} ${d}, ${y}`
}

/** "Actualizado" / "Updated" label per locale. */
export function updatedLabel(locale: Locale): string {
  return locale === "es" ? "Actualizado" : "Updated"
}

/** Byline label per locale (links to /nosotros — E-E-A-T author attribution). */
export function authorByline(locale: Locale): string {
  return locale === "es" ? `Por ${FOUNDER.name}` : `By ${FOUNDER.name}`
}
