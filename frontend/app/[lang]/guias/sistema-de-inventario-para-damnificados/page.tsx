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

const KEY = "guias/sistema-de-inventario-para-damnificados"

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
  heroP: string
  errorH2: string
  errorP: string
  buildH2: string
  steps: HowToStep[]
  coordH2: string
  coordP: string
  ctaBoxTitle: string
  ctaStart: string
  ctaNeeds: string
  crumbHome: string
  crumbGuides: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Sistema de inventario para damnificados en una emergencia",
    description:
      "Cómo montar un inventario de ayuda para damnificados que sí sirva: registro por ítem, control de caducidad y visibilidad de qué falta en tiempo real.",
    ogEyebrow: "Guía",
    eyebrow: "Guía",
    h1: "Sistema de inventario para damnificados",
    heroP:
      "Tras un desastre, la ayuda llega en avalancha y sin orden. El problema no suele ser la falta de donaciones, sino la falta de un inventario que diga qué hay realmente disponible y qué falta. Esta guía explica cómo montar ese inventario para que la ayuda llegue a los damnificados ordenada y a tiempo.",
    errorH2: "El error más común: contar volumen, no ítems",
    errorP:
      "Un inventario que dice “20 cajas de medicamentos” no sirve para coordinar: no sabes qué medicamentos, en qué cantidad, con qué caducidad. Cuando llega el momento de preparar un envío o responder qué se necesita, esa información no está. Registrar por ítem desde el inicio es lo que evita ese callejón sin salida.",
    buildH2: "Cómo montar un inventario que sí sirva",
    steps: [
      {
        name: "Registra por ítem desde la primera donación",
        text: "Captura cada donación con categoría, lote y caducidad, no como bultos genéricos. Es lo que después permite responder qué hay y qué falta, no solo cuánto volumen entró.",
      },
      {
        name: "Aplica reglas de caducidad al recibir",
        text: "Rechaza medicamentos con menos de 365 días de vida útil y alimentos con menos de 180 días. Un inventario lleno de producto no distribuible no ayuda a nadie.",
      },
      {
        name: "Empaca en cajas homogéneas con etiqueta",
        text: "Un producto, un lote, una caducidad por caja, con código QR. Así el inventario se mantiene fiel cuando la carga se mueve entre bodega, tarima y envío.",
      },
      {
        name: "Publica qué falta en tiempo real",
        text: "Expón el inventario disponible por categoría para que donantes y coordinadores vean qué se necesita realmente, y no llegue más de lo que sobra.",
      },
    ],
    coordH2: "De inventario a coordinación",
    coordP:
      "Un inventario aislado ayuda a un centro; una coordinación ayuda a una región. Cuando varios puntos usan el mismo estándar, su stock se puede sumar en un panel único y responder, a nivel nacional, qué falta y dónde. Ese salto — de inventario a agregación — es el que convierte donaciones dispersas en respuesta ordenada.",
    ctaBoxTitle: "Monta tu inventario de ayuda con Araguaney",
    ctaStart: "Empezar ahora",
    ctaNeeds: "Ver qué falta ahora mismo",
    crumbHome: "Inicio",
    crumbGuides: "Guías",
  },
  en: {
    metaTitle: "Inventory system for disaster relief in an emergency",
    description:
      "How to build an aid inventory for disaster victims that actually works: item-level intake, expiry control, and real-time visibility into what's missing.",
    ogEyebrow: "Guide",
    eyebrow: "Guide",
    h1: "Inventory system for disaster relief",
    heroP:
      "After a disaster, aid arrives in an avalanche and without order. The problem is rarely a lack of donations, but a lack of an inventory that tells you what's really available and what's missing. This guide explains how to build that inventory so aid reaches disaster victims in order and on time.",
    errorH2: "The most common mistake: counting volume, not items",
    errorP:
      "An inventory that says “20 boxes of medicine” is useless for coordination: you don't know which medicines, in what quantity, with what expiry. When the time comes to prepare a shipment or answer what's needed, that information isn't there. Registering item by item from the start is what avoids that dead end.",
    buildH2: "How to build an inventory that actually works",
    steps: [
      {
        name: "Register item by item from the very first donation",
        text: "Capture every donation with category, batch and expiry, not as generic bulk. That's what later lets you answer what there is and what's missing, not just how much volume came in.",
      },
      {
        name: "Apply expiry rules on intake",
        text: "Reject medicine with less than 365 days of shelf life and food with less than 180 days. An inventory full of undistributable product helps no one.",
      },
      {
        name: "Pack into homogeneous, labeled boxes",
        text: "One product, one batch, one expiry per box, with a QR code. That way the inventory stays accurate as cargo moves between warehouse, pallet and shipment.",
      },
      {
        name: "Publish what's missing in real time",
        text: "Expose the available inventory by category so donors and coordinators see what's truly needed, and no more arrives of what's already in surplus.",
      },
    ],
    coordH2: "From inventory to coordination",
    coordP:
      "An isolated inventory helps one center; coordination helps a region. When several points use the same standard, their stock can be added up in a single dashboard and answer, at a national level, what's missing and where. That leap — from inventory to aggregation — is what turns scattered donations into an orderly response.",
    ctaBoxTitle: "Build your aid inventory with Araguaney",
    ctaStart: "Get started now",
    ctaNeeds: "See what's missing right now",
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
  return {
    title: c.metaTitle,
    description: c.description,
    alternates: alternates(KEY, lang),
    openGraph: { title: `${c.metaTitle} — Araguaney`, description: c.description, images: [ogImage] },
    twitter: { card: "summary_large_image", title: `${c.metaTitle} — Araguaney`, description: c.description, images: [ogImage] },
  }
}

export default async function InventarioDamnificadosGuidePage({
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
  const structuredData = [
    articleSchema({ title: c.metaTitle, description: c.description, path: localizedPath(KEY, locale) }),
    howToSchema({ name: c.metaTitle, description: c.description, path: localizedPath(KEY, locale), steps: c.steps }),
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

            <p className="text-[15px] md:text-[17px] mb-8" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.heroP}
            </p>

            <h2 style={h2Style}>{c.errorH2}</h2>
            <p style={pStyle}>{c.errorP}</p>

            <h2 style={h2Style}>{c.buildH2}</h2>
            <ol className="space-y-4 mb-8 mt-3" style={{ listStyle: "none", padding: 0, margin: "12px 0 32px" }}>
              {c.steps.map((step, i) => (
                <li key={step.name} className="p-4" style={{ border: "1px solid #EEE6D4", borderRadius: 12, background: "#fff" }}>
                  <p className="text-[14px] font-semibold mb-1" style={{ color: "#2B2723" }}>
                    {i + 1}. {step.name}
                  </p>
                  <p className="text-[13.5px]" style={{ margin: 0, color: "#6E6557", lineHeight: 1.55 }}>{step.text}</p>
                </li>
              ))}
            </ol>

            <h2 style={h2Style}>{c.coordH2}</h2>
            <p style={pStyle}>{c.coordP}</p>

            <div
              className="mt-10 p-6 md:p-8 text-center"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
                {c.ctaBoxTitle}
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <CtaLink
                  href="/login"
                  ctaLabel="guia_inventario_damnificados_final"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  {c.ctaStart}
                </CtaLink>
                <Link
                  href="/necesidades"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  {c.ctaNeeds}
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
