import type { Metadata } from "next"
import localFont from "next/font/local"
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration"
import { GoogleAnalytics } from "@/components/GoogleAnalytics"
import { getLocale, getDictionary } from "@/lib/i18n"
import { SITE_URL } from "@/lib/seo"
import "./globals.css"

/*
  Las dos familias viven en el repositorio, no en `next/font/google`.

  Con el cargador de Google, cada compilación pide el CSS a
  `fonts.googleapis.com` y luego los `.woff2` a `fonts.gstatic.com`. Google rota
  el nombre de esos archivos sin avisar, y una compilación que reusa caché queda
  pidiendo archivos que ya no existen: 404 en el archivo, `Module not found` en
  Turbopack y despliegue de producción caído por algo que no cambió nadie. Pasó
  el 16 de agosto de 2026.

  Son los mismos archivos que servía Google: variables por grosor, subconjunto
  latino, sin eje de tamaño óptico. Medido en el inicio, la página descarga
  137,044 bytes de fuentes contra 137,120 con el cargador anterior, así que el
  cambio es de origen, no de peso. Se prefirió esta variante a la que incluye
  eje óptico porque esa pesa 287 KB y nadie estaba pagando eso antes.

  Ambas familias son SIL OFL 1.1; las licencias viajan junto a los archivos.
*/
const hanken = localFont({
  variable: "--font-hanken",
  display: "swap",
  adjustFontFallback: "Arial",
  src: [
    {
      path: "./fonts/hanken-grotesk-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
})

const sourceSerif = localFont({
  variable: "--font-source-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  src: [
    {
      path: "./fonts/source-serif-4-latin-wght-normal.woff2",
      weight: "200 900",
      style: "normal",
    },
    {
      path: "./fonts/source-serif-4-latin-wght-italic.woff2",
      weight: "200 900",
      style: "italic",
    },
  ],
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
    // Sin `icons` a propósito: los declara la convención de archivos de Next
    // (app/favicon.ico y app/apple-icon.png). Declararlos aquí los sobrescribe,
    // que es como el árbol de marcador de posición sobrevivió al logo real.
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
      {/* Las extensiones del navegador (ColorZilla, Grammarly…) inyectan atributos en
          <body> antes de que React hidrate; sin esto el diff sale como error de hidratación. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <ServiceWorkerRegistration />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
