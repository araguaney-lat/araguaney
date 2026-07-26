import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { CONTENT_DATES, formatContentDate, updatedLabel, authorByline } from "@/lib/content-dates"
import { type Locale, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { articleSchema, breadcrumbSchema } from "@/lib/structured-data"

const KEY = "guias/que-se-puede-donar"

interface Categoria {
  icon: string
  title: string
  desc: string
}
interface Content {
  metaTitle: string
  ogTitle: string
  description: string
  ogEyebrow: string
  eyebrow: string
  h1: string
  intro: string
  categoriesH2: string
  categorias: Categoria[]
  medsH2: string
  medsP: string
  foodH2: string
  foodP: string
  noDonarH2: string
  noDonar: string[]
  ctaLead: string
  ctaInventory: string
  ctaGuide: string
  crumbHome: string
  crumbGuias: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Qué se puede donar en un centro de acopio",
    ogTitle: "Qué se puede donar en un centro de acopio — Araguaney",
    description:
      "Categorías aceptadas en un centro de acopio, reglas de la OMS para medicamentos y alimentos, y qué donaciones se rechazan y por qué.",
    ogEyebrow: "Guía",
    eyebrow: "Guía",
    h1: "Qué se puede donar en un centro de acopio",
    intro:
      "No toda donación con buena intención es útil o segura para canalizar hacia una emergencia. Estas son las categorías que un centro de acopio bien organizado acepta, y las reglas detrás de cada una.",
    categoriesH2: "Categorías aceptadas",
    categorias: [
      { icon: "💊", title: "Medicamentos", desc: "Con INN, lote y caducidad. Mínimo 365 días de vida útil restante. Sin sustancias controladas." },
      { icon: "🩺", title: "Insumos médicos", desc: "Material de curación, guantes, mascarillas, jeringas, clasificados por el catálogo IFRC/ICRC." },
      { icon: "🥫", title: "Alimentos", desc: "No perecederos, mínimo 180 días de vida útil restante (configurable según el producto)." },
      { icon: "💧", title: "Agua", desc: "Embotellada o en garrafón, sellada de fábrica." },
      { icon: "🧼", title: "Higiene", desc: "Jabón, pasta dental, toallas sanitarias, pañales, sin abrir." },
      { icon: "🔧", title: "Herramientas", desc: "Palas, machetes, cascos: equipo para remoción de escombros y reconstrucción." },
      { icon: "🦺", title: "Equipo de rescate", desc: "Chalecos, linternas, cuerdas, según el catálogo IOM de artículos de emergencia." },
    ],
    medsH2: "Reglas de la OMS para medicamentos",
    medsP:
      "Siguiendo las WHO Guidelines for Medicine Donations, un medicamento solo se acepta si tiene al menos 365 días de vida útil restante a la fecha de recepción, y si se puede registrar con denominación INN, forma farmacéutica, concentración, lote y caducidad. Las sustancias controladas quedan bloqueadas: no se aceptan bajo ninguna circunstancia.",
    foodH2: "Reglas para alimentos",
    foodP:
      "Los alimentos donados deben tener al menos 180 días de vida útil restante (este umbral es configurable por tipo de producto). Deben ser no perecederos y venir en su empaque original y sellado.",
    noDonarH2: "Qué NO se puede donar",
    noDonar: [
      "Medicamentos con menos de 365 días de vida útil restante, o sin lote/caducidad legible.",
      "Sustancias controladas (bloqueadas automáticamente en el registro).",
      "Alimentos perecederos o sin fecha de caducidad verificable.",
      "Ropa usada o artículos que no correspondan a una categoría del catálogo de ayuda humanitaria.",
    ],
    ctaLead: "Mira qué se necesita ahora mismo",
    ctaInventory: "Ver inventario disponible",
    ctaGuide: "Cómo organizar un centro de acopio",
    crumbHome: "Inicio",
    crumbGuias: "Guías",
  },
  en: {
    metaTitle: "What can be donated at a collection center",
    ogTitle: "What can be donated at a collection center — Araguaney",
    description:
      "Categories accepted at a collection center, WHO rules for medicines and food, and which donations are rejected and why.",
    ogEyebrow: "Guide",
    eyebrow: "Guide",
    h1: "What can be donated at a collection center",
    intro:
      "Not every well-intentioned donation is useful or safe to channel toward an emergency. These are the categories a well-organized collection center accepts, and the rules behind each one.",
    categoriesH2: "Accepted categories",
    categorias: [
      { icon: "💊", title: "Medicine", desc: "With INN name, batch and expiry. At least 365 days of remaining shelf life. No controlled substances." },
      { icon: "🩺", title: "Medical supplies", desc: "Wound care, gloves, masks, syringes, classified by the IFRC/ICRC catalogue." },
      { icon: "🥫", title: "Food", desc: "Non-perishable, at least 180 days of remaining shelf life (configurable per product)." },
      { icon: "💧", title: "Water", desc: "Bottled or in jugs, factory-sealed." },
      { icon: "🧼", title: "Hygiene", desc: "Soap, toothpaste, sanitary pads, diapers, unopened." },
      { icon: "🔧", title: "Tools", desc: "Shovels, machetes, helmets: gear for debris removal and reconstruction." },
      { icon: "🦺", title: "Rescue gear", desc: "Vests, flashlights, ropes, per the IOM emergency relief items catalogue." },
    ],
    medsH2: "WHO rules for medicines",
    medsP:
      "Following the WHO Guidelines for Medicine Donations, a medicine is only accepted if it has at least 365 days of remaining shelf life at the date of receipt, and if it can be registered with an INN name, pharmaceutical form, strength, batch and expiry. Controlled substances are blocked: they are not accepted under any circumstances.",
    foodH2: "Rules for food",
    foodP:
      "Donated food must have at least 180 days of remaining shelf life (this threshold is configurable per product type). It must be non-perishable and come in its original, sealed packaging.",
    noDonarH2: "What cannot be donated",
    noDonar: [
      "Medicines with less than 365 days of remaining shelf life, or without a legible batch/expiry.",
      "Controlled substances (automatically blocked at intake).",
      "Perishable food or food without a verifiable expiry date.",
      "Used clothing or items that don't match a category in the humanitarian aid catalogue.",
    ],
    ctaLead: "See what's needed right now",
    ctaInventory: "View available inventory",
    ctaGuide: "How to organize a collection center",
    crumbHome: "Home",
    crumbGuias: "Guides",
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
  const { lang } = await params
  const c = CONTENT[lang]
  const ogImage = ogImageUrl(c.metaTitle, c.ogEyebrow)
  return {
    title: c.metaTitle,
    description: c.description,
    alternates: alternates(KEY, lang),
    openGraph: { title: c.ogTitle, description: c.description, images: [ogImage] },
    twitter: { card: "summary_large_image", title: c.ogTitle, description: c.description, images: [ogImage] },
  }
}

export default async function QueSePuedeDonarGuidePage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang: locale } = await params
  const dict = await getDictionary(locale)
  const c = CONTENT[locale]

  const crumbs = [
    { name: c.crumbHome, path: localizedPath("", locale) },
    { name: c.crumbGuias, path: localizedPath("guias", locale) },
    { name: c.metaTitle, path: localizedPath(KEY, locale) },
  ]
  const dates = CONTENT_DATES[KEY]
  const structuredData = [
    articleSchema({
      title: c.metaTitle,
      description: c.description,
      path: localizedPath(KEY, locale),
      locale,
      datePublished: dates?.published,
      dateModified: dates?.modified,
    }),
    breadcrumbSchema(crumbs),
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

        <article className="px-5 md:px-[46px] pt-[26px] md:pt-[56px] pb-16 md:pb-20">
          <div className="max-w-[680px] mx-auto">
            <div className="mb-4">
              <Breadcrumbs items={crumbs} />
            </div>

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
              {c.eyebrow}
            </div>

            <h1
              className="text-[28px] md:text-[38px] mb-5"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.15, margin: "0 0 20px" }}
            >
              {c.h1}
            </h1>

            {dates && (
              <p className="text-[12.5px] mb-6" style={{ color: "#8A8073" }}>
                <Link href={localizedPath("nosotros", locale)} style={{ color: "#906400", fontWeight: 600 }}>
                  {authorByline(locale)}
                </Link>
                {" · "}
                {updatedLabel(locale)} {formatContentDate(dates.modified, locale)}
              </p>
            )}

            <p className="text-[15px] md:text-[17px] mb-8" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.intro}
            </p>

            <h2 style={h2Style}>{c.categoriesH2}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {c.categorias.map((cat) => (
                <div
                  key={cat.title}
                  className="flex gap-3 items-start p-4"
                  style={{ border: "1px solid #EEE6D4", borderRadius: 12, background: "#fff" }}
                >
                  <span className="text-[22px] flex-none leading-none mt-0.5">{cat.icon}</span>
                  <div>
                    <p className="text-[14px] font-semibold mb-1" style={{ color: "#2B2723" }}>{cat.title}</p>
                    <p className="text-[13px]" style={{ margin: 0, color: "#6E6557", lineHeight: 1.5 }}>{cat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 style={h2Style}>{c.medsH2}</h2>
            <p style={pStyle}>{c.medsP}</p>

            <h2 style={h2Style}>{c.foodH2}</h2>
            <p style={pStyle}>{c.foodP}</p>

            <h2 style={h2Style}>{c.noDonarH2}</h2>
            <ul className="mb-8" style={{ paddingLeft: 20 }}>
              {c.noDonar.map((item) => (
                <li key={item} className="text-[14.5px] mb-2" style={{ color: "#5C5347", lineHeight: 1.6 }}>
                  {item}
                </li>
              ))}
            </ul>

            <div
              className="p-6 md:p-8 text-center"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
                {c.ctaLead}
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <Link
                  href="/necesidades"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  {c.ctaInventory}
                </Link>
                <Link
                  href="/guias/como-organizar-un-centro-de-acopio"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  {c.ctaGuide}
                </Link>
              </div>
            </div>
          </div>
        </article>

        <HomeFooter dict={dict.footer} locale={locale} />
      </div>
    </>
  )
}

const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-source-serif)",
  fontWeight: 600,
  fontSize: 21,
  color: "#2B2723",
  margin: "32px 0 12px",
}

const pStyle: React.CSSProperties = {
  color: "#5C5347",
  lineHeight: 1.65,
  fontSize: 15,
  margin: "0 0 8px",
}
