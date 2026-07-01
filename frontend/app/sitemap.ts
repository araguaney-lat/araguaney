import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

// Campaign landing pages and QR fichas are not yet listed here: there is no
// public listing endpoint to enumerate them (see backend/app/routers/dashboard.py
// public/* routes, which are lookup-by-code/campaign only). Add them once a
// public listing endpoint exists (tracked in phase-11 Group A/C).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/necesidades`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/contacto`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ]
}
