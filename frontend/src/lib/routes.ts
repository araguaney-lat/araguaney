// Locale constants live here (not in i18n.ts) because this module is imported
// by the middleware (edge runtime) and client components — it must NOT pull in
// `server-only`. i18n.ts re-exports these for server code.
export type Locale = "es" | "en"
export const LOCALES: Locale[] = ["es", "en"]
export const DEFAULT_LOCALE: Locale = "es"

export function isLocale(v: string): v is Locale {
  return (LOCALES as string[]).includes(v)
}

// ── Central route map ─────────────────────────────────────────────────────────
// Single source of truth for localized URLs. The KEY is the canonical route id
// (chosen to equal the Spanish slug). Each key maps to a slug per locale.
// Adding a language = add its slug to every entry. Adding a route = add a key.
//
// Only keys listed here are "migrated" — the i18n middleware rewrites their URLs
// into the app/[lang] tree; everything else falls through to its flat page.
export const ROUTE_SLUGS: Record<string, Record<Locale, string>> = {
  "": { es: "", en: "" }, // home
  "centro-de-acopio": { es: "centro-de-acopio", en: "collection-center" },
  "registrar-centro": { es: "registrar-centro", en: "register-center" },
  "registrar-centro/confirmar": {
    es: "registrar-centro/confirmar",
    en: "register-center/confirm",
  },
  "ayuda-humanitaria": { es: "ayuda-humanitaria", en: "humanitarian-aid" },
  "alternativa-a-excel-para-donaciones": {
    es: "alternativa-a-excel-para-donaciones",
    en: "donation-spreadsheet-alternative",
  },
  "como-funciona": { es: "como-funciona", en: "how-it-works" },
  "aviso-de-privacidad": { es: "aviso-de-privacidad", en: "privacy" },
  "terminos": { es: "terminos", en: "terms" },
  "contacto": { es: "contacto", en: "contact" },
  "guias": { es: "guias", en: "guides" },
  "guias/como-organizar-un-centro-de-acopio": {
    es: "guias/como-organizar-un-centro-de-acopio",
    en: "guides/how-to-organize-a-collection-center",
  },
  "guias/que-se-puede-donar": {
    es: "guias/que-se-puede-donar",
    en: "guides/what-can-be-donated",
  },
  "guias/como-preparar-carga-humanitaria-para-aduana": {
    es: "guias/como-preparar-carga-humanitaria-para-aduana",
    en: "guides/how-to-prepare-humanitarian-cargo-for-customs",
  },
  "guias/como-registrar-voluntarios-en-un-centro-de-acopio": {
    es: "guias/como-registrar-voluntarios-en-un-centro-de-acopio",
    en: "guides/how-to-register-volunteers",
  },
  "guias/software-gratis-para-gestionar-donaciones-ong": {
    es: "guias/software-gratis-para-gestionar-donaciones-ong",
    en: "guides/free-donation-software-for-ngos",
  },
  "guias/sistema-de-inventario-para-damnificados": {
    es: "guias/sistema-de-inventario-para-damnificados",
    en: "guides/inventory-system-for-disaster-relief",
  },
  "glosario": { es: "glosario", en: "glossary" },
  "necesidades": { es: "necesidades", en: "needs" },
  "necesidades/medicamentos": { es: "necesidades/medicamentos", en: "needs/medicine" },
  "necesidades/insumos-medicos": { es: "necesidades/insumos-medicos", en: "needs/medical-supplies" },
  "necesidades/alimentos": { es: "necesidades/alimentos", en: "needs/food" },
  "necesidades/agua": { es: "necesidades/agua", en: "needs/water" },
  "necesidades/higiene": { es: "necesidades/higiene", en: "needs/hygiene" },
  "necesidades/herramientas": { es: "necesidades/herramientas", en: "needs/tools" },
  "necesidades/equipo-de-rescate": { es: "necesidades/equipo-de-rescate", en: "needs/rescue-gear" },
  // More routes migrate here in subs 2d–4 (eventos, qr, …).
}

export type RouteKey = keyof typeof ROUTE_SLUGS

export const ROUTE_KEYS = Object.keys(ROUTE_SLUGS) as RouteKey[]

export function isMigrated(key: string): key is RouteKey {
  return key in ROUTE_SLUGS
}

// Build the public, outward-facing path for a route in a locale.
// es (default) → unprefixed: "/centro-de-acopio", ""→"/".
// other locale → prefixed:   "/en/collection-center".
export function localizedPath(key: RouteKey, locale: Locale): string {
  const slug = ROUTE_SLUGS[key][locale]
  if (locale === DEFAULT_LOCALE) {
    return slug ? `/${slug}` : "/"
  }
  return slug ? `/${locale}/${slug}` : `/${locale}`
}

// Reverse lookup: a localized slug (as seen in the URL for that locale) → key.
// Returns null when the slug isn't a migrated route for that locale.
export function resolveSlug(locale: Locale, slug: string): RouteKey | null {
  for (const key of ROUTE_KEYS) {
    if (ROUTE_SLUGS[key][locale] === slug) return key
  }
  return null
}

// The canonical (Spanish) slug used inside the app/[lang] tree for a key.
export function canonicalSlug(key: RouteKey): string {
  return ROUTE_SLUGS[key].es
}
