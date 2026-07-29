import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

// Las fichas publicas de QR incrustan la imagen directo del backend
// (`{API}/b/{code}/qr.png`), asi que su origen tiene que estar en img-src o el
// navegador la bloquea sin decir nada visible en la pagina.
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "").origin
  } catch {
    return ""
  }
})()

const imgSrc = [
  "'self'", "data:", "blob:",
  "https://res.cloudinary.com",
  "https://www.google-analytics.com",
  ...(apiOrigin ? [apiOrigin] : []),
].join(" ")

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // `camera=(self)`: el escáner de QR (/dashboard/scan, intake) necesita getUserMedia.
  // Solo mismo origen; ningún tercero embebido (Turnstile) hereda el permiso.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src ${imgSrc}`,
      "font-src 'self'",
      "connect-src 'self' https://*.sentry.io https://*.ingest.sentry.io https://challenges.cloudflare.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
  // The /dashboard/ayuda/[slug] pages read content/manuals/*.html via fs at
  // request time (the dashboard is auth-gated, so these render dynamically).
  // The slug is dynamic, so trace the whole folder into the serverless bundle.
  outputFileTracingIncludes: {
    "/dashboard/ayuda/[slug]": ["./content/manuals/**"],
  },
  experimental: {
    // Default Server Action body limit is 1MB — too small for avatar photo uploads
    // (matches the 5MB cap enforced server-side in ProfileService.upload_avatar).
    serverActions: { bodySizeLimit: "5mb" },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dtvdqlxtd/**",
      },
    ],
    // Cache optimized images for 30 days at the edge — reduces re-optimization under load
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Restrict to common breakpoints only — fewer cache key combinations = smaller attack surface
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [16, 32, 64, 128, 256],
    // Single format — halves the number of cache variants
    formats: ["image/webp"],
  },
}

export default withSentryConfig(nextConfig, {
  org: "bioflow",
  project: "araguaney",
  silent: !process.env.CI,
  // Applies to both webpack and turbopack builds.
  widenClientFileUpload: true,
  // `disableLogger` y `automaticVercelMonitors` de nivel raíz están deprecados
  // desde @sentry/nextjs 10: ahora viven bajo `webpack` porque no tienen efecto
  // en builds con Turbopack, y agruparlos lo hace explícito.
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
})
