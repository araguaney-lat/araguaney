import fs from "node:fs"
import path from "node:path"
import type { Locale } from "@/lib/routes"

type L10n = Record<Locale, string>

export interface ManualMeta {
  slug: string
  title: L10n
  blurb: L10n
}

export interface ManualGroup {
  group: L10n
  items: ManualMeta[]
}

// Registry of the in-app manuals. Each slug maps to the manual body at
// content/manuals/<slug>.html (es) and content/manuals/en/<slug>.html (en),
// styled by ./manual.css. Slugs stay in Spanish (same as the panel routes).
export const MANUAL_GROUPS: readonly ManualGroup[] = [
  {
    group: { es: "Primeros pasos", en: "Getting started" },
    items: [
      {
        slug: "overview",
        title: { es: "Cómo funciona Araguaney", en: "How Araguaney works" },
        blurb: {
          es: "El flujo completo, los conceptos, los estados y el mapa de módulos del panel.",
          en: "The full flow, the concepts, the statuses, and the map of the panel's modules.",
        },
      },
    ],
  },
  {
    group: { es: "Flujo principal", en: "Main flow" },
    items: [
      {
        slug: "recepcion",
        title: { es: "Recepción", en: "Intake" },
        blurb: {
          es: "Registrar una donación por ítem.",
          en: "Register a donation item by item.",
        },
      },
      {
        slug: "cajas",
        title: { es: "Cajas", en: "Boxes" },
        blurb: {
          es: "Sellar cajas e imprimir etiquetas QR.",
          en: "Seal boxes and print QR labels.",
        },
      },
      {
        slug: "tarimas",
        title: { es: "Tarimas", en: "Pallets" },
        blurb: {
          es: "Agrupar cajas selladas y cerrar tarimas.",
          en: "Group sealed boxes and close pallets.",
        },
      },
      {
        slug: "envios",
        title: { es: "Envíos y manifiesto", en: "Shipments and manifest" },
        blurb: {
          es: "Consolidar tarimas y generar el manifiesto.",
          en: "Consolidate pallets and generate the manifest.",
        },
      },
    ],
  },
  {
    group: { es: "Módulos de apoyo", en: "Supporting modules" },
    items: [
      {
        slug: "catalogo",
        title: { es: "Catálogo", en: "Catalog" },
        blurb: {
          es: "Los tipos de producto (SKU) y sus atributos.",
          en: "Product types (SKUs) and their attributes.",
        },
      },
      {
        slug: "campanas",
        title: { es: "Campañas", en: "Campaigns" },
        blurb: {
          es: "Organizar donaciones por causa, con página pública.",
          en: "Organize donations by cause, with a public page.",
        },
      },
      {
        slug: "centros",
        title: { es: "Centros", en: "Centers" },
        blurb: {
          es: "Alta y administración de centros de acopio.",
          en: "Create and manage collection centers.",
        },
      },
      {
        slug: "transferencias",
        title: { es: "Transferencias", en: "Transfers" },
        blurb: {
          es: "Mover cajas selladas entre centros.",
          en: "Move sealed boxes between centers.",
        },
      },
      {
        slug: "escanear",
        title: { es: "Escanear", en: "Scan" },
        blurb: {
          es: "Leer un QR para ver la ficha de una caja o tarima.",
          en: "Scan a QR to view a box or pallet's details.",
        },
      },
      {
        slug: "nacional",
        title: { es: "Panel Nacional", en: "National Dashboard" },
        blurb: {
          es: "El stock agregado de todos los centros.",
          en: "The aggregated stock across all centers.",
        },
      },
      {
        slug: "solicitudes",
        title: { es: "Solicitudes", en: "Requests" },
        blurb: {
          es: "Pedir y resolver, con hilo de mensajes.",
          en: "Request and resolve, with a message thread.",
        },
      },
      {
        slug: "usuarios",
        title: { es: "Usuarios", en: "Users" },
        blurb: {
          es: "Crear cuentas, roles y reseteo de contraseña.",
          en: "Create accounts, roles, and password reset.",
        },
      },
      {
        slug: "auditoria",
        title: { es: "Auditoría", en: "Audit" },
        blurb: {
          es: "La bitácora de acciones sensibles.",
          en: "The log of sensitive actions.",
        },
      },
      {
        slug: "reportes",
        title: { es: "Reportes", en: "Reports" },
        blurb: {
          es: "Resumen por campaña de cuánto se ha reunido.",
          en: "Per-campaign summary of how much has been gathered.",
        },
      },
    ],
  },
]

const BY_SLUG = new Map<string, ManualMeta>(
  MANUAL_GROUPS.flatMap((g) => g.items.map((i) => [i.slug, i] as const)),
)

export const ALL_SLUGS: readonly string[] = [...BY_SLUG.keys()]

export function getManual(slug: string): ManualMeta | undefined {
  return BY_SLUG.get(slug)
}

// Localized views for the pages ─────────────────────────────────────────────
export interface LocalizedManual {
  slug: string
  title: string
  blurb: string
}

export interface LocalizedGroup {
  group: string
  items: LocalizedManual[]
}

export function localizedGroups(locale: Locale): LocalizedGroup[] {
  return MANUAL_GROUPS.map((g) => ({
    group: g.group[locale],
    items: g.items.map((i) => ({ slug: i.slug, title: i.title[locale], blurb: i.blurb[locale] })),
  }))
}

export function localizedManual(slug: string, locale: Locale): LocalizedManual | undefined {
  const m = getManual(slug)
  return m ? { slug: m.slug, title: m.title[locale], blurb: m.blurb[locale] } : undefined
}

// Read the manual body. en → content/manuals/en/<slug>.html; es → the flat file.
export function readManualHtml(slug: string, locale: Locale): string {
  const base = path.join(process.cwd(), "content", "manuals")
  const file = locale === "en" ? path.join(base, "en", `${slug}.html`) : path.join(base, `${slug}.html`)
  return fs.readFileSync(file, "utf-8")
}
