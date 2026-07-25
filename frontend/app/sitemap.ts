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
      url: absoluteUrl(localizedPath("registrar-centro", "es")),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages: langAlternates("registrar-centro") },
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
      url: absoluteUrl(localizedPath("alternativa-a-excel-para-donaciones", "es")),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
      alternates: { languages: langAlternates("alternativa-a-excel-para-donaciones") },
    },
    {
      url: absoluteUrl(localizedPath("necesidades", "es")),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
      alternates: { languages: langAlternates("necesidades") },
    },
    {
      url: absoluteUrl(localizedPath("guias", "es")),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages: langAlternates("guias") },
    },
    ...(
      [
        "guias/como-organizar-un-centro-de-acopio",
        "guias/que-se-puede-donar",
        "guias/como-preparar-carga-humanitaria-para-aduana",
        "guias/como-registrar-voluntarios-en-un-centro-de-acopio",
        "guias/software-gratis-para-gestionar-donaciones-ong",
        "guias/sistema-de-inventario-para-damnificados",
      ] as const
    ).map((key) => ({
      url: absoluteUrl(localizedPath(key, "es")),
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.6,
      alternates: { languages: langAlternates(key) },
    })),
    {
      url: absoluteUrl(localizedPath("glosario", "es")),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: { languages: langAlternates("glosario") },
    },
    ...NEEDS_CATEGORIES.map((c) => {
      const key = `necesidades/${c.slug}` as RouteKey
      return {
        url: absoluteUrl(localizedPath(key, "es")),
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.7,
        alternates: { languages: langAlternates(key) },
      }
    }),
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
