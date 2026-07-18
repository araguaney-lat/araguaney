import type { Metadata } from "next"
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google"
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration"
import { GoogleAnalytics } from "@/components/GoogleAnalytics"
import { getLocale, getDictionary } from "@/lib/i18n"
import { SITE_URL } from "@/lib/seo"
import "./globals.css"

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
})

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const { site_title, site_description } = dict.seo

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: site_title,
      template: `%s · Araguaney`,
    },
    description: site_description,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/icons/icon.svg",
      apple: "/icons/icon.svg",
    },
    // Note: openGraph/twitter images intentionally omitted here so the
    // file-convention card (app/opengraph-image.tsx, app/twitter-image.tsx)
    // is used as the site-wide default. Pages that set their own
    // openGraph.images (guides, eventos) override that card for their route.
    openGraph: {
      title: site_title,
      description: site_description,
      type: "website",
      locale: locale === "en" ? "en_US" : "es_MX",
    },
    twitter: {
      card: "summary_large_image",
      title: site_title,
      description: site_description,
    },
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      className={`${hanken.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistration />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
