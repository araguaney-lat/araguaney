import type { Metadata } from "next"
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google"
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

export const metadata: Metadata = {
  title: "Araguaney — Coordinación de centros de acopio",
  description:
    "Un mismo estándar para registrar, empacar en cajas homogéneas con QR y enviar con manifiesto exportable.",
  icons: {
    icon: "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782786243/araguaney_logo_ol8lm1.ico",
  },
  openGraph: {
    title: "Araguaney — Coordinación de centros de acopio",
    description:
      "Un mismo estándar para registrar, empacar en cajas homogéneas con QR y enviar con manifiesto exportable.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    type: "website",
    locale: "es_MX",
  },
  twitter: {
    card: "summary_large_image",
    title: "Araguaney — Coordinación de centros de acopio",
    description:
      "Un mismo estándar para registrar, empacar en cajas homogéneas con QR y enviar con manifiesto exportable.",
    images: [OG_IMAGE],
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${hanken.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
