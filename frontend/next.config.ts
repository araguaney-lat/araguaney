import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
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
