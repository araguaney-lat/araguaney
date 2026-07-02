import type { MetadataRoute } from "next"
import { apiFetch } from "@/lib/api"
import { SITE_URL } from "@/lib/seo"
import type { PublicCampaignListItem } from "@/types"

// QR fichas are not listed here: there is no public listing endpoint to
// enumerate box/pallet codes (backend/app/routers/dashboard.py's public/qr/{code}
// route is lookup-by-code only, by design — codes aren't meant to be enumerable).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Hard timeout so a slow/unreachable backend can never hang sitemap
  // generation — Next.js retries a stalled metadata route 3× at 60s each
  // before failing the whole build, so a bare try/catch isn't enough if the
  // request never rejects (network black-hole rather than a fast error).
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
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/centro-de-acopio`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/ayuda-humanitaria`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/humanitarian-aid`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/necesidades`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
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
      url: `${SITE_URL}/contacto`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...campaigns.map((c) => ({
      url: `${SITE_URL}/eventos/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
  ]
}
