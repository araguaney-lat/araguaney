import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://www.google-analytics.com",
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
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
})
