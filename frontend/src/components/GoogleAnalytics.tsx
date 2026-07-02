"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// Only tracks public marketing pages — never the authenticated dashboard/studio,
// which would mix internal team usage into visit→signup funnel data and
// conflicts with this product's "no personal data" posture for its own users.
export function GoogleAnalytics() {
  const pathname = usePathname()
  const isAuthenticatedArea = pathname?.startsWith("/dashboard") || pathname?.startsWith("/studio")

  if (!MEASUREMENT_ID || isAuthenticatedArea) return null

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${MEASUREMENT_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  )
}
