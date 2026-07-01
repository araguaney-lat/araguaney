import type { Metadata } from "next"
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google"
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration"
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

const OG_IMAGE =
  "https://res.cloudinary.com/dtvdqlxtd/image/upload/w_1200,h_630,c_pad,b_white,f_png/v1782786243/araguaney_logo_ol8lm1"

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
    openGraph: {
      title: site_title,
      description: site_description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
      type: "website",
      locale: locale === "en" ? "en_US" : "es_MX",
    },
    twitter: {
      card: "summary_large_image",
      title: site_title,
      description: site_description,
      images: [OG_IMAGE],
    },
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
      </body>
    </html>
  )
}
