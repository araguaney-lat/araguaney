import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { JsonLd } from "@/components/JsonLd"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { CONTENT_DATES, formatContentDate, updatedLabel, authorByline } from "@/lib/content-dates"
import { type Locale, localizedPath } from "@/lib/routes"
import {
  articleSchema,
  howToSchema,
  faqSchema,
  breadcrumbSchema,
} from "@/lib/structured-data"

const KEY = "guias/como-organizar-un-centro-de-acopio"

interface Faq {
  q: string
  a: string
}
interface Section {
  h2: string
  p: string
}
interface HowToStep {
  name: string
  text: string
}
interface Content {
  metaTitle: string
  description: string
  ogEyebrow: string
  eyebrow: string
  h1: string
  intro: string
  sections: Section[]
  faqTitle: string
  faq: Faq[]
  howToSteps: HowToStep[]
  ctaLead: string
  ctaPrimary: string
  ctaSecondary: string
  crumbHome: string
  crumbGuides: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Cómo organizar un centro de acopio",
    description:
      "Guía práctica para organizar un centro de acopio desde cero: roles, registro de donaciones, cajas homogéneas, manifiesto y reglas de rechazo.",
    ogEyebrow: "Guía",
    eyebrow: "Guía",
    h1: "Cómo organizar un centro de acopio",
    intro:
      "Un centro de acopio recibe donaciones en especie — medicamentos, alimentos, agua, higiene, herramientas — para canalizarlas hacia zonas afectadas por una emergencia. Esta guía cubre lo esencial para organizarlo bien desde el primer día, sin importar si es tu primer centro o si ya llevas semanas operando de forma improvisada.",
    sections: [
      {
        h2: "1. Define roles antes de recibir la primera donación",
        p: "Con 2-3 voluntarios y un coordinador es suficiente para empezar. Separa las responsabilidades: alguien recibe y registra cada donación, alguien empaca y sella cajas, y el coordinador consolida tarimas y gestiona los envíos. Sin esta división, es fácil perder trazabilidad desde el primer día.",
      },
      {
        h2: "2. Registra cada ítem, no solo “bultos”",
        p: "El error más común de un centro improvisado es contar donaciones en cajas o bolsas genéricas (“3 cajas de medicamentos”) en vez de por ítem. Registra cada donación con su categoría, lote y fecha de caducidad. Esto es lo que permite después saber exactamente qué hay disponible — no solo cuánto volumen.",
      },
      {
        h2: "3. Empaca en cajas homogéneas",
        p: "Una caja homogénea contiene un solo tipo de producto, un solo lote y una sola fecha de caducidad — sin mezclas. Cada caja sellada recibe un código QR y una etiqueta. Esto no es burocracia: es exactamente lo que exige el régimen de envío humanitario para que la carga no se atore en aduana.",
      },
      {
        h2: "4. Consolida en tarimas y genera el manifiesto",
        p: "Las cajas selladas se agrupan en tarimas (mixtas, pueden llevar distintos productos). Cuando el envío está listo, se genera un manifiesto exportable — packing list con cada caja y tarima — listo para el trámite aduanal.",
      },
      {
        h2: "5. Conoce las reglas de rechazo antes de que lleguen donaciones",
        p: "No todo lo que se dona se puede aceptar. Los medicamentos con menos de 365 días de vida útil restante se rechazan (lineamientos de la OMS para donación de medicamentos), igual que las sustancias controladas. Los alimentos requieren al menos 180 días de vida útil restante. Conocer estas reglas de antemano evita conflictos incómodos al momento de recibir una donación.",
      },
    ],
    faqTitle: "Preguntas frecuentes",
    faq: [
      {
        q: "¿Cuántas personas se necesitan para operar un centro de acopio?",
        a: "Con 2-3 voluntarios y un coordinador es suficiente para empezar: alguien recibe y registra, alguien empaca y sella cajas, y el coordinador consolida tarimas y gestiona envíos.",
      },
      {
        q: "¿Qué pasa si llega una donación mixta (varios productos en una misma bolsa)?",
        a: "Se separa por producto, lote y caducidad al registrar — cada combinación distinta se convierte en su propia caja homogénea. Nunca se mezcla más de un producto en una caja.",
      },
      {
        q: "¿Se puede operar sin conexión a internet?",
        a: "El registro de donaciones funciona offline y se sincroniza cuando vuelve la conexión. Las operaciones que requieren validación en tiempo real (como crear un nuevo tipo de producto) sí requieren conexión.",
      },
      {
        q: "¿Qué hago si un medicamento no cumple la vida útil mínima?",
        a: "Se rechaza en el registro — Araguaney bloquea automáticamente medicamentos con menos de 365 días de vida útil restante, siguiendo los lineamientos de la OMS para donación de medicamentos.",
      },
    ],
    howToSteps: [
      {
        name: "Define roles antes de recibir la primera donación",
        text: "Con 2-3 voluntarios y un coordinador es suficiente para empezar: alguien recibe y registra, alguien empaca y sella cajas, y el coordinador consolida tarimas y gestiona envíos.",
      },
      {
        name: "Registra cada ítem, no solo bultos",
        text: "Registra cada donación con su categoría, lote y fecha de caducidad, en vez de contar cajas o bolsas genéricas. Es lo que permite saber después qué hay disponible exactamente.",
      },
      {
        name: "Empaca en cajas homogéneas",
        text: "Cada caja contiene un solo tipo de producto, un solo lote y una sola caducidad — sin mezclas — y recibe un código QR y una etiqueta al sellarse.",
      },
      {
        name: "Consolida en tarimas y genera el manifiesto",
        text: "Las cajas selladas se agrupan en tarimas mixtas. Cuando el envío está listo, se genera un manifiesto exportable (packing list) listo para el trámite aduanal.",
      },
      {
        name: "Conoce las reglas de rechazo",
        text: "Los medicamentos con menos de 365 días de vida útil restante se rechazan (lineamientos de la OMS), igual que las sustancias controladas. Los alimentos requieren al menos 180 días.",
      },
    ],
    ctaLead: "Aplica este estándar en tu centro de acopio con Araguaney",
    ctaPrimary: "Ver el estándar completo",
    ctaSecondary: "Ver qué falta ahora mismo",
    crumbHome: "Inicio",
    crumbGuides: "Guías",
  },
  en: {
    metaTitle: "How to organize a collection center",
    description:
      "A practical guide to organizing a collection center from scratch: roles, donation intake, homogeneous boxes, the manifest, and rejection rules.",
    ogEyebrow: "Guide",
    eyebrow: "Guide",
    h1: "How to organize a collection center",
    intro:
      "A collection center receives in-kind donations — medicine, food, water, hygiene, tools — to channel them toward areas hit by an emergency. This guide covers the essentials to organize it well from day one, whether it's your first center or you've already been operating in an improvised way for weeks.",
    sections: [
      {
        h2: "1. Define roles before receiving the first donation",
        p: "With 2-3 volunteers and a coordinator it's enough to get started. Split the responsibilities: someone receives and registers each donation, someone packs and seals boxes, and the coordinator consolidates pallets and manages shipments. Without this division, it's easy to lose traceability from day one.",
      },
      {
        h2: "2. Register every item, not just “bundles”",
        p: "The most common mistake of an improvised center is counting donations in generic boxes or bags (“3 boxes of medicine”) instead of item by item. Register every donation with its category, batch, and expiry date. That's what later lets you know exactly what's available — not just how much volume.",
      },
      {
        h2: "3. Pack into homogeneous boxes",
        p: "A homogeneous box contains a single product type, a single batch, and a single expiry date — no mixing. Each sealed box gets a QR code and a label. This isn't bureaucracy: it's exactly what the humanitarian shipping regime requires so the cargo doesn't get stuck at customs.",
      },
      {
        h2: "4. Consolidate into pallets and generate the manifest",
        p: "Sealed boxes are grouped into pallets (mixed, they can carry different products). When the shipment is ready, an exportable manifest is generated — a packing list with every box and pallet — ready for the customs process.",
      },
      {
        h2: "5. Know the rejection rules before donations arrive",
        p: "Not everything donated can be accepted. Medicines with less than 365 days of remaining shelf life are rejected (WHO guidelines for medicine donations), as are controlled substances. Food requires at least 180 days of remaining shelf life. Knowing these rules in advance avoids awkward conflicts at the moment a donation is received.",
      },
    ],
    faqTitle: "Frequently asked questions",
    faq: [
      {
        q: "How many people are needed to run a collection center?",
        a: "With 2-3 volunteers and a coordinator it's enough to get started: someone receives and registers, someone packs and seals boxes, and the coordinator consolidates pallets and manages shipments.",
      },
      {
        q: "What happens if a mixed donation arrives (several products in the same bag)?",
        a: "It's separated by product, batch, and expiry at registration — each distinct combination becomes its own homogeneous box. More than one product is never mixed in a single box.",
      },
      {
        q: "Can it be operated without an internet connection?",
        a: "Donation registration works offline and syncs when the connection returns. Operations that require real-time validation (such as creating a new product type) do require a connection.",
      },
      {
        q: "What do I do if a medicine doesn't meet the minimum shelf life?",
        a: "It's rejected at registration — Araguaney automatically blocks medicines with less than 365 days of remaining shelf life, following the WHO guidelines for medicine donations.",
      },
    ],
    howToSteps: [
      {
        name: "Define roles before receiving the first donation",
        text: "With 2-3 volunteers and a coordinator it's enough to get started: someone receives and registers, someone packs and seals boxes, and the coordinator consolidates pallets and manages shipments.",
      },
      {
        name: "Register every item, not just bundles",
        text: "Register every donation with its category, batch, and expiry date, instead of counting generic boxes or bags. That's what later lets you know exactly what's available.",
      },
      {
        name: "Pack into homogeneous boxes",
        text: "Each box contains a single product type, a single batch, and a single expiry — no mixing — and gets a QR code and a label when sealed.",
      },
      {
        name: "Consolidate into pallets and generate the manifest",
        text: "Sealed boxes are grouped into mixed pallets. When the shipment is ready, an exportable manifest (packing list) is generated, ready for the customs process.",
      },
      {
        name: "Know the rejection rules",
        text: "Medicines with less than 365 days of remaining shelf life are rejected (WHO guidelines), as are controlled substances. Food requires at least 180 days.",
      },
    ],
    ctaLead: "Apply this standard in your collection center with Araguaney",
    ctaPrimary: "See the full standard",
    ctaSecondary: "See what's needed right now",
    crumbHome: "Home",
    crumbGuides: "Guides",
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
  const ogTitle = `${c.metaTitle} — Araguaney`
  return {
    title: c.metaTitle,
    description: c.description,
    alternates: alternates(KEY, lang),
    openGraph: { title: ogTitle, description: c.description, images: [ogImage] },
    twitter: { card: "summary_large_image", title: ogTitle, description: c.description, images: [ogImage] },
  }
}

export default async function ComoOrganizarGuidePage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang: locale } = await params
  const dict = await getDictionary(locale)
  const c = CONTENT[locale]

  const crumbs = [
    { name: c.crumbHome, path: localizedPath("", locale) },
    { name: c.crumbGuides, path: localizedPath("guias", locale) },
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
    howToSchema({
      name: c.metaTitle,
      description: c.description,
      path: localizedPath(KEY, locale),
      steps: c.howToSteps,
      locale,
      datePublished: dates?.published,
      dateModified: dates?.modified,
    }),
    faqSchema(c.faq),
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

            {c.sections.map((section) => (
              <div key={section.h2}>
                <h2 style={h2Style}>{section.h2}</h2>
                <p style={pStyle}>{section.p}</p>
              </div>
            ))}

            <h2 style={h2Style}>{c.faqTitle}</h2>
            <div className="space-y-5 mb-10">
              {c.faq.map((f) => (
                <div key={f.q}>
                  <h3
                    className="text-[15px] md:text-[16px] mb-1.5"
                    style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723" }}
                  >
                    {f.q}
                  </h3>
                  <p className="text-[14px]" style={{ color: "#6E6557", lineHeight: 1.6, margin: 0 }}>
                    {f.a}
                  </p>
                </div>
              ))}
            </div>

            <div
              className="p-6 md:p-8 text-center"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
                {c.ctaLead}
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <Link
                  href={localizedPath("centro-de-acopio", locale)}
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{
                    background: "#1F5E8C",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    borderRadius: 99,
                  }}
                >
                  {c.ctaPrimary}
                </Link>
                <Link
                  href="/necesidades"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{
                    border: "1.5px solid #E6D4A6",
                    color: "#2B2723",
                    fontWeight: 600,
                    fontSize: 14,
                    borderRadius: 99,
                  }}
                >
                  {c.ctaSecondary}
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
  margin: 0,
}
