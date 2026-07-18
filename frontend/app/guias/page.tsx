import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { getDictionary } from "@/lib/i18n"
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { breadcrumbSchema, type Schema } from "@/lib/structured-data"

const PATH = "/guias"
const TITLE = "Guías para centros de acopio y ayuda humanitaria"
const DESCRIPTION =
  "Guías prácticas para organizar un centro de acopio, saber qué se puede donar y preparar carga humanitaria que pase por aduana sin atorarse."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
}

const GUIDES = [
  {
    href: "/guias/como-organizar-un-centro-de-acopio",
    title: "Cómo organizar un centro de acopio",
    desc: "Roles, registro de donaciones por ítem, cajas homogéneas, manifiesto y reglas de rechazo — todo lo esencial para arrancar bien desde el primer día.",
  },
  {
    href: "/guias/que-se-puede-donar",
    title: "Qué se puede donar",
    desc: "Categorías aceptadas, reglas de la OMS para medicamentos y alimentos, y qué donaciones se rechazan y por qué.",
  },
  {
    href: "/guias/como-preparar-carga-humanitaria-para-aduana",
    title: "Cómo preparar carga para aduana",
    desc: "Qué exige el régimen de envío humanitario, qué debe incluir un manifiesto/packing list y los errores más comunes que atoran un envío.",
  },
] as const

const STRUCTURED_DATA: Schema[] = [
  breadcrumbSchema([
    { name: "Inicio", path: "/" },
    { name: "Guías", path: PATH },
  ]),
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    itemListElement: GUIDES.map((guide, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: guide.title,
      url: absoluteUrl(guide.href),
    })),
  },
]

export default async function GuiasIndexPage() {
  const dict = await getDictionary("es")

  return (
    <>
      <JsonLd data={STRUCTURED_DATA} />
      <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <HomeNav dict={dict.nav} locale="es" localeLinks={{}} />
        <div className="h-[56px] md:hidden" />

        <div className="px-5 md:px-[46px] pt-[26px] md:pt-[56px] pb-16 md:pb-20 flex-1">
          <div className="max-w-[680px] mx-auto">
            <div
              className="text-[10.5px] md:text-[12px] mb-3"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#946A00",
                fontWeight: 700,
              }}
            >
              <span style={{ width: 18, height: 1.5, background: "#906400", display: "inline-block" }} />
              Guías
            </div>

            <h1
              className="text-[28px] md:text-[38px] mb-4"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.15, margin: "0 0 16px" }}
            >
              Guías para centros de acopio
            </h1>

            <p className="text-[15px] md:text-[17px] mb-9" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              Cómo organizar la operación, qué donaciones aceptar y cómo preparar carga
              humanitaria que cumpla el estándar de envío. Basadas en lineamientos de la OMS,
              IFRC/ICRC e IOM.
            </p>

            <div className="space-y-4">
              {GUIDES.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="block p-5 md:p-6 transition-colors"
                  style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
                >
                  <h2
                    className="text-[17px] md:text-[19px] mb-1.5"
                    style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723", margin: "0 0 6px" }}
                  >
                    {guide.title}
                  </h2>
                  <p className="text-[14px]" style={{ color: "#6E6557", lineHeight: 1.6, margin: 0 }}>
                    {guide.desc}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <HomeFooter dict={dict.footer} />
      </div>
    </>
  )
}
