import type { MetadataRoute } from "next"
import { apiFetch } from "@/lib/api"
import { SITE_URL, absoluteUrl } from "@/lib/seo"
import { type RouteKey, LOCALES, localizedPath } from "@/lib/routes"
import { NEEDS_CATEGORIES } from "@/lib/needs-categories"

// hreflang alternates map for a migrated route, for a sitemap entry.
function langAlternates(key: RouteKey): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of LOCALES) out[l] = absoluteUrl(localizedPath(key, l))
  return out
}
import type { PublicCampaignListItem } from "@/types"

// Force this route to render at request time instead of during `next build`.
// The build's static-generation worker hung for 60s x 3 attempts trying to
// reach the backend for /v1/public/campaigns — even with an AbortSignal
// timeout on the fetch — and failed the whole Vercel deployment. Whatever the
// exact cause (build sandbox network restrictions, DNS-level hang below where
// AbortSignal can intervene), the fix is to not attempt this fetch during the
// build at all. At request time in the deployed serverless function, normal
// network egress applies and this behaves like any other dynamic route.
export const dynamic = "force-dynamic"

// QR fichas are not listed here: there is no public listing endpoint to
// enumerate box/pallet codes (backend/app/routers/dashboard.py's public/qr/{code}
// route is lookup-by-code only, by design — codes aren't meant to be enumerable).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Still keep a fetch-level timeout as defense-in-depth for the deployed
  // runtime — a slow/unreachable backend at request time should degrade to
  // the static-only sitemap instead of hanging the response.
  let campaigns: PublicCampaignListItem[] = []
  try {
    campaigns = await apiFetch<PublicCampaignListItem[]>("/v1/public/campaigns", {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    campaigns = []
  }

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: langAlternates("") },
    },
    {
      url: absoluteUrl(localizedPath("centro-de-acopio", "es")),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages: langAlternates("centro-de-acopio") },
    },
    {
      url: absoluteUrl(localizedPath("como-funciona", "es")),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages: langAlternates("como-funciona") },
    },
    {
      url: absoluteUrl(localizedPath("ayuda-humanitaria", "es")),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages: langAlternates("ayuda-humanitaria") },
    },
    {
      url: `${SITE_URL}/necesidades`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/guias`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/guias/como-organizar-un-centro-de-acopio`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/guias/que-se-puede-donar`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/guias/como-preparar-carga-humanitaria-para-aduana`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/guias/como-registrar-voluntarios-en-un-centro-de-acopio`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/guias/software-gratis-para-gestionar-donaciones-ong`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/guias/sistema-de-inventario-para-damnificados`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/glosario`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...NEEDS_CATEGORIES.map((c) => ({
      url: `${SITE_URL}/necesidades/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    {
      url: absoluteUrl(localizedPath("contacto", "es")),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
      alternates: { languages: langAlternates("contacto") },
    },
    {
      url: absoluteUrl(localizedPath("aviso-de-privacidad", "es")),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
      alternates: { languages: langAlternates("aviso-de-privacidad") },
    },
    {
      url: absoluteUrl(localizedPath("terminos", "es")),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
      alternates: { languages: langAlternates("terminos") },
    },
    ...campaigns.map((c) => ({
      url: `${SITE_URL}/eventos/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
  ]
}
