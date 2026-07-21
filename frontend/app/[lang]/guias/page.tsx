import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates, absoluteUrl } from "@/lib/seo"
import { type Locale, type RouteKey, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { breadcrumbSchema, type Schema } from "@/lib/structured-data"

const KEY = "guias"

const GUIDE_KEYS: RouteKey[] = [
  "guias/como-organizar-un-centro-de-acopio",
  "guias/que-se-puede-donar",
  "guias/como-preparar-carga-humanitaria-para-aduana",
  "guias/como-registrar-voluntarios-en-un-centro-de-acopio",
  "guias/software-gratis-para-gestionar-donaciones-ong",
  "guias/sistema-de-inventario-para-damnificados",
]

interface GuideCard {
  title: string
  desc: string
}
interface Content {
  metaTitle: string
  description: string
  ogEyebrow: string
  eyebrow: string
  h1: string
  lede: string
  glossaryText: string
  glossaryLink: string
  crumbHome: string
  crumbSelf: string
  guides: GuideCard[]
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Guías para centros de acopio y ayuda humanitaria",
    description:
      "Guías prácticas para organizar un centro de acopio, saber qué se puede donar y preparar carga humanitaria que pase por aduana sin atorarse.",
    ogEyebrow: "Guías",
    eyebrow: "Guías",
    h1: "Guías para centros de acopio",
    lede: "Cómo organizar la operación, qué donaciones aceptar y cómo preparar carga humanitaria que cumpla el estándar de envío. Basadas en lineamientos de la OMS, IFRC/ICRC e IOM.",
    glossaryText: "¿Dudas con un término? ",
    glossaryLink: "Consulta el glosario de ayuda humanitaria →",
    crumbHome: "Inicio",
    crumbSelf: "Guías",
    guides: [
      { title: "Cómo organizar un centro de acopio", desc: "Roles, registro de donaciones por ítem, cajas homogéneas, manifiesto y reglas de rechazo — todo lo esencial para arrancar bien desde el primer día." },
      { title: "Qué se puede donar", desc: "Categorías aceptadas, reglas de la OMS para medicamentos y alimentos, y qué donaciones se rechazan y por qué." },
      { title: "Cómo preparar carga para aduana", desc: "Qué exige el régimen de envío humanitario, qué debe incluir un manifiesto/packing list y los errores más comunes que atoran un envío." },
      { title: "Cómo registrar y organizar voluntarios", desc: "Cómo estructurar los roles del equipo — quién recibe, quién empaca y quién coordina — para no perder trazabilidad desde el primer día." },
      { title: "Software gratis para gestionar donaciones", desc: "Qué buscar en un software gratuito para gestionar donaciones en especie: registro por ítem, trazabilidad, manifiesto y agregación entre centros." },
      { title: "Sistema de inventario para damnificados", desc: "Cómo montar un inventario de ayuda que sí sirva en una emergencia: registro por ítem, control de caducidad y visibilidad de qué falta." },
    ],
  },
  en: {
    metaTitle: "Guides for collection centers and humanitarian aid",
    description:
      "Practical guides to organize a collection center, know what can be donated, and prepare humanitarian cargo that clears customs without getting stuck.",
    ogEyebrow: "Guides",
    eyebrow: "Guides",
    h1: "Guides for collection centers",
    lede: "How to organize the operation, which donations to accept, and how to prepare humanitarian cargo that meets the shipping standard. Based on WHO, IFRC/ICRC and IOM guidelines.",
    glossaryText: "Unsure about a term? ",
    glossaryLink: "Check the humanitarian aid glossary →",
    crumbHome: "Home",
    crumbSelf: "Guides",
    guides: [
      { title: "How to organize a collection center", desc: "Roles, item-level donation intake, homogeneous boxes, manifest and rejection rules — the essentials to start off right from day one." },
      { title: "What can be donated", desc: "Accepted categories, WHO rules for medicine and food, and which donations are rejected and why." },
      { title: "How to prepare cargo for customs", desc: "What the humanitarian shipping regime requires, what a manifest/packing list must include, and the most common mistakes that stall a shipment." },
      { title: "How to register and organize volunteers", desc: "How to structure the team's roles — who receives, who packs and who coordinates — so you don't lose traceability from day one." },
      { title: "Free software to manage donations", desc: "What to look for in free software to manage in-kind donations: item-level intake, traceability, manifest and cross-center aggregation." },
      { title: "Inventory system for disaster relief", desc: "How to set up a relief inventory that actually works in an emergency: item-level intake, expiry control and visibility of what's missing." },
    ],
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
  const { lang } = await params
  const c = CONTENT[lang]
  const ogImage = ogImageUrl(c.h1, c.ogEyebrow)
  return {
    title: c.metaTitle,
    description: c.description,
    alternates: alternates(KEY, lang),
    openGraph: { title: `${c.metaTitle} — Araguaney`, description: c.description, images: [ogImage] },
    twitter: { card: "summary_large_image", title: `${c.metaTitle} — Araguaney`, description: c.description, images: [ogImage] },
  }
}

export default async function GuiasIndexPage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang: locale } = await params
  const dict = await getDictionary(locale)
  const c = CONTENT[locale]

  const crumbs = [
    { name: c.crumbHome, path: localizedPath("", locale) },
    { name: c.crumbSelf, path: localizedPath(KEY, locale) },
  ]
  const guides = GUIDE_KEYS.map((gkey, i) => ({
    href: localizedPath(gkey, locale),
    title: c.guides[i].title,
    desc: c.guides[i].desc,
  }))
  const structuredData: Schema[] = [
    breadcrumbSchema(crumbs),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: c.metaTitle,
      itemListElement: guides.map((guide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: guide.title,
        url: absoluteUrl(guide.href),
      })),
    },
  ]

  return (
    <>
      <JsonLd data={structuredData} />
      <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <HomeNav
          dict={dict.nav}
          locale={locale}
          localeLinks={{ es: localizedPath(KEY, "es"), en: localizedPath(KEY, "en") }}
        />
        <div className="h-[56px] md:hidden" />

        <div className="px-5 md:px-[46px] pt-[26px] md:pt-[56px] pb-16 md:pb-20 flex-1">
          <div className="max-w-[680px] mx-auto">
            <div className="mb-4">
              <Breadcrumbs items={crumbs} />
            </div>
            <div
              className="text-[10.5px] md:text-[12px] mb-3"
              style={{ display: "inline-flex", alignItems: "center", gap: 7, letterSpacing: "0.1em", textTransform: "uppercase", color: "#946A00", fontWeight: 700 }}
            >
              <span style={{ width: 18, height: 1.5, background: "#906400", display: "inline-block" }} />
              {c.eyebrow}
            </div>

            <h1
              className="text-[28px] md:text-[38px] mb-4"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.15, margin: "0 0 16px" }}
            >
              {c.h1}
            </h1>

            <p className="text-[15px] md:text-[17px] mb-9" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.lede}
            </p>

            <div className="space-y-4">
              {guides.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="block p-5 md:p-6 transition-colors"
                  style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
                >
                  <h2 className="text-[17px] md:text-[19px] mb-1.5" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723", margin: "0 0 6px" }}>
                    {guide.title}
                  </h2>
                  <p className="text-[14px]" style={{ color: "#6E6557", lineHeight: 1.6, margin: 0 }}>
                    {guide.desc}
                  </p>
                </Link>
              ))}
            </div>

            <p className="text-[14px] mt-8" style={{ color: "#6E6557" }}>
              {c.glossaryText}
              <Link href={localizedPath("glosario", locale)} style={{ color: "#1F5E8C", fontWeight: 600 }}>
                {c.glossaryLink}
              </Link>
            </p>
          </div>
        </div>

        <HomeFooter dict={dict.footer} locale={locale} />
      </div>
    </>
  )
}
