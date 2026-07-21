import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { articleSchema, howToSchema, breadcrumbSchema } from "@/lib/structured-data"

const KEY = "guias/como-preparar-carga-humanitaria-para-aduana"
const GUIDES_KEY = "guias"
const CROSS_GUIDE_KEY = "guias/como-organizar-un-centro-de-acopio"

interface Section {
  h2: string
  p: string
}
interface Erroneo {
  title: string
  desc: string
}
interface Step {
  name: string
  text: string
}
interface Content {
  eyebrow: string
  ogEyebrow: string
  title: string
  description: string
  heroP: string
  sections: Section[]
  erroresH2: string
  errores: Erroneo[]
  ctaCardTitle: string
  ctaStart: string
  ctaKnow: string
  steps: Step[]
  crumbHome: string
  crumbGuides: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    eyebrow: "Guía",
    ogEyebrow: "Guía",
    title: "Cómo preparar carga humanitaria para aduana",
    description:
      "Qué exige el régimen de envío humanitario, qué debe incluir un manifiesto/packing list, y los errores más comunes que atoran un envío en aduana.",
    heroP:
      "Una carga humanitaria mal documentada se atora en aduana — no por mala fe de nadie, sino porque la autoridad aduanal no puede verificar rápido qué contiene cada bulto. Esta guía explica qué exige el régimen de envío y cómo evitar los errores más comunes.",
    sections: [
      {
        h2: "El régimen: cajas homogéneas + manifiesto detallado",
        p: "El requisito central es simple de enunciar y difícil de improvisar bajo presión: cada caja debe contener un solo tipo de producto, un solo lote y una sola caducidad, y el envío completo debe venir acompañado de un manifiesto que liste cada caja y su contenido. Sin ese orden, los envíos se atoran.",
      },
      {
        h2: "Qué debe incluir un manifiesto",
        p: "Un manifiesto (packing list) humanitario completo incluye, por cada caja: código de material o clasificación reconocida (IFRC/ICRC, UNSPSC), descripción del producto, cantidad, unidad y peso. A nivel de envío, debe listar también las tarimas que agrupan esas cajas y el peso total consolidado.",
      },
      {
        h2: "Cómo Araguaney genera el manifiesto automáticamente",
        p: "Como cada caja ya se registró y selló como homogénea — con su producto, lote y caducidad — el manifiesto se genera directamente a partir de las tarimas y cajas del envío, sin captura manual adicional. El resultado es un PDF exportable listo para aduana, y opcionalmente un Excel con columnas alineadas al formato IFRC.",
      },
    ],
    erroresH2: "Errores comunes que atoran un envío",
    errores: [
      { title: "Cajas mixtas", desc: "Una caja con varios productos, lotes o caducidades distintas — aduana no puede verificar el contenido con precisión." },
      { title: "Sin manifiesto detallado", desc: "Un envío sin packing list caja por caja obliga a una inspección física completa, retrasando el despacho días o semanas." },
      { title: "Códigos de material inconsistentes", desc: "No usar una clasificación reconocida (IFRC/ICRC, UNSPSC) dificulta que la aduana entienda qué se está enviando." },
      { title: "Sin trazabilidad de lote/caducidad en medicamentos", desc: "Los medicamentos sin esta información suelen ser rechazados directamente por la autoridad sanitaria del país receptor." },
    ],
    ctaCardTitle: "Genera manifiestos exportables desde el primer envío",
    ctaStart: "Empezar ahora",
    ctaKnow: "Conoce Araguaney",
    steps: [
      {
        name: "Empaca cada caja como homogénea",
        text: "Cada caja debe contener un solo tipo de producto, un solo lote y una sola caducidad. Sin ese orden, la aduana no puede verificar el contenido y el envío se atora.",
      },
      {
        name: "Clasifica con un código reconocido",
        text: "Asigna a cada caja una clasificación reconocida (IFRC/ICRC o UNSPSC) para que la autoridad aduanal entienda rápido qué se está enviando.",
      },
      {
        name: "Genera el manifiesto caja por caja",
        text: "El packing list debe listar, por cada caja: código de material, descripción, cantidad, unidad y peso; y a nivel de envío, las tarimas y el peso total consolidado.",
      },
    ],
    crumbHome: "Inicio",
    crumbGuides: "Guías",
  },
  en: {
    eyebrow: "Guide",
    ogEyebrow: "Guide",
    title: "How to prepare humanitarian cargo for customs",
    description:
      "What the humanitarian shipping regime requires, what a manifest/packing list must include, and the most common mistakes that get a shipment stuck at customs.",
    heroP:
      "Poorly documented humanitarian cargo gets stuck at customs — not out of anyone's bad faith, but because the customs authority can't quickly verify what each package contains. This guide explains what the shipping regime requires and how to avoid the most common mistakes.",
    sections: [
      {
        h2: "The regime: homogeneous boxes + a detailed manifest",
        p: "The core requirement is simple to state and hard to improvise under pressure: each box must contain a single type of product, a single batch and a single expiry date, and the whole shipment must come with a manifest that lists every box and its contents. Without that order, shipments get stuck.",
      },
      {
        h2: "What a manifest must include",
        p: "A complete humanitarian manifest (packing list) includes, for each box: material code or recognized classification (IFRC/ICRC, UNSPSC), product description, quantity, unit and weight. At the shipment level, it must also list the pallets that group those boxes and the total consolidated weight.",
      },
      {
        h2: "How Araguaney generates the manifest automatically",
        p: "Because each box was already registered and sealed as homogeneous — with its product, batch and expiry — the manifest is generated directly from the shipment's pallets and boxes, with no additional manual entry. The result is an exportable PDF ready for customs, and optionally an Excel file with columns aligned to the IFRC format.",
      },
    ],
    erroresH2: "Common mistakes that get a shipment stuck",
    errores: [
      { title: "Mixed boxes", desc: "A box with several products, batches or different expiry dates — customs can't verify the contents precisely." },
      { title: "No detailed manifest", desc: "A shipment without a box-by-box packing list forces a full physical inspection, delaying clearance by days or weeks." },
      { title: "Inconsistent material codes", desc: "Not using a recognized classification (IFRC/ICRC, UNSPSC) makes it harder for customs to understand what is being shipped." },
      { title: "No batch/expiry traceability for medicine", desc: "Medicines without this information are often rejected outright by the receiving country's health authority." },
    ],
    ctaCardTitle: "Generate exportable manifests from your very first shipment",
    ctaStart: "Start now",
    ctaKnow: "Discover Araguaney",
    steps: [
      {
        name: "Pack each box as homogeneous",
        text: "Each box must contain a single type of product, a single batch and a single expiry date. Without that order, customs can't verify the contents and the shipment gets stuck.",
      },
      {
        name: "Classify with a recognized code",
        text: "Assign each box a recognized classification (IFRC/ICRC or UNSPSC) so the customs authority quickly understands what is being shipped.",
      },
      {
        name: "Generate the manifest box by box",
        text: "The packing list must list, for each box: material code, description, quantity, unit and weight; and at the shipment level, the pallets and the total consolidated weight.",
      },
    ],
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
  const ogImage = ogImageUrl(c.title, c.ogEyebrow)
  return {
    title: c.title,
    description: c.description,
    alternates: alternates(KEY, lang),
    openGraph: { title: `${c.title} — Araguaney`, description: c.description, images: [ogImage] },
    twitter: { card: "summary_large_image", title: `${c.title} — Araguaney`, description: c.description, images: [ogImage] },
  }
}

export default async function AduanaGuidePage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang: locale } = await params
  const dict = await getDictionary(locale)
  const c = CONTENT[locale]

  const selfPath = localizedPath(KEY, locale)
  const crumbs = [
    { name: c.crumbHome, path: localizedPath("", locale) },
    { name: c.crumbGuides, path: localizedPath(GUIDES_KEY, locale) },
    { name: c.title, path: selfPath },
  ]

  const structuredData = [
    articleSchema({ title: c.title, description: c.description, path: selfPath }),
    howToSchema({ name: c.title, description: c.description, path: selfPath, steps: c.steps }),
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
              {c.title}
            </h1>

            <p className="text-[15px] md:text-[17px] mb-8" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.heroP}
            </p>

            {c.sections.map((section) => (
              <div key={section.h2}>
                <h2 style={h2Style}>{section.h2}</h2>
                <p style={pStyle}>{section.p}</p>
              </div>
            ))}

            <h2 style={h2Style}>{c.erroresH2}</h2>
            <div className="space-y-4 mb-8 mt-3">
              {c.errores.map((e) => (
                <div
                  key={e.title}
                  className="p-4"
                  style={{ border: "1px solid #EEE6D4", borderRadius: 12, background: "#fff" }}
                >
                  <p className="text-[14px] font-semibold mb-1" style={{ color: "#2B2723" }}>{e.title}</p>
                  <p className="text-[13.5px]" style={{ margin: 0, color: "#6E6557", lineHeight: 1.55 }}>{e.desc}</p>
                </div>
              ))}
            </div>

            <div
              className="p-6 md:p-8 text-center"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
                {c.ctaCardTitle}
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <CtaLink
                  href="/login"
                  ctaLabel="guia_aduana_final"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  {c.ctaStart}
                </CtaLink>
                <Link
                  href={localizedPath("ayuda-humanitaria", locale)}
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  {c.ctaKnow}
                </Link>
              </div>
            </div>

            <p className="text-[13.5px] mt-6 text-center" style={{ color: "#6E6557" }}>
              <Link href={localizedPath(CROSS_GUIDE_KEY, locale)} style={{ color: "#1F5E8C", fontWeight: 600 }}>
                {locale === "es"
                  ? "Guía: cómo organizar un centro de acopio →"
                  : "Guide: how to organize a collection center →"}
              </Link>
            </p>
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
