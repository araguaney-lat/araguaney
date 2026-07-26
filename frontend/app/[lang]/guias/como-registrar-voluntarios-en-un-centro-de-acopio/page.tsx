import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { CONTENT_DATES, formatContentDate, updatedLabel, authorByline } from "@/lib/content-dates"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { type Locale, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { articleSchema, howToSchema, breadcrumbSchema } from "@/lib/structured-data"

const KEY = "guias/como-registrar-voluntarios-en-un-centro-de-acopio"

interface Step {
  name: string
  text: string
}
interface Content {
  metaTitle: string
  description: string
  eyebrow: string
  h1: string
  intro: string
  section1H2: string
  section1P: string
  stepsH2: string
  steps: Step[]
  section3H2: string
  section3P: string
  ctaTitle: string
  ctaPrimary: string
  ctaSecondary: string
  crumbHome: string
  crumbGuides: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Cómo registrar y organizar voluntarios en un centro de acopio",
    description:
      "Cómo estructurar los roles de los voluntarios de un centro de acopio para no perder trazabilidad: quién recibe, quién empaca y quién coordina.",
    eyebrow: "Guía",
    h1: "Cómo registrar y organizar voluntarios",
    intro:
      "Un centro de acopio se mueve gracias a sus voluntarios, pero sin una estructura clara de roles es fácil perder trazabilidad desde el primer día: donaciones sin registrar, cajas sin sellar, nadie seguro de quién hizo qué. Esta guía explica cómo organizar y registrar a los voluntarios para que la operación se mantenga ordenada.",
    section1H2: "Separar responsabilidades antes que sumar manos",
    section1P:
      "El instinto en una emergencia es sumar voluntarios lo más rápido posible. Pero sin roles definidos, más manos significan más confusión. Lo primero no es cuántos son, sino que cada quien sepa exactamente qué le toca: recibir, empacar o coordinar.",
    stepsH2: "Cómo organizar a los voluntarios paso a paso",
    steps: [
      {
        name: "Define los tres roles básicos",
        text: "Voluntario que recibe y registra donaciones, voluntario que empaca y sella cajas, y coordinador que consolida tarimas y gestiona envíos. Con 2-3 voluntarios y un coordinador se puede arrancar.",
      },
      {
        name: "Da a cada voluntario su propia cuenta",
        text: "Cada persona opera con su usuario, no con uno compartido. Así cada acción (registrar, sellar, cerrar una tarima) queda atribuida a quien la hizo, sin ambigüedad.",
      },
      {
        name: "Asigna permisos según el rol",
        text: "El voluntario registra y sella; el coordinador además cierra tarimas y envíos y genera manifiestos. Limitar permisos evita errores irreversibles bajo presión.",
      },
      {
        name: "Mantén la trazabilidad de cada acción",
        text: "Cada cambio de estado (caja sellada, tarima cerrada, envío despachado) deja registro de quién y cuándo. Eso permite auditar la operación y resolver dudas después.",
      },
    ],
    section3H2: "Por qué las cuentas individuales importan",
    section3P:
      "Compartir un solo usuario “del centro” ahorra un minuto al inicio y cuesta horas después: cuando algo no cuadra, nadie sabe quién lo hizo. Con una cuenta por voluntario y permisos por rol, cada acción queda atribuida y la operación se puede auditar sin señalar a ciegas.",
    ctaTitle: "Organiza a tu equipo con Araguaney",
    ctaPrimary: "Empezar ahora",
    ctaSecondary: "Guía: organizar un centro de acopio",
    crumbHome: "Inicio",
    crumbGuides: "Guías",
  },
  en: {
    metaTitle: "How to register and organize volunteers at a collection center",
    description:
      "How to structure a collection center's volunteer roles so you never lose traceability: who receives, who packs and who coordinates.",
    eyebrow: "Guide",
    h1: "How to register and organize volunteers",
    intro:
      "A collection center runs on its volunteers, but without a clear role structure it's easy to lose traceability from day one: unregistered donations, unsealed boxes, no one sure who did what. This guide explains how to organize and register volunteers so the operation stays in order.",
    section1H2: "Separate responsibilities before adding hands",
    section1P:
      "The instinct in an emergency is to add volunteers as fast as possible. But without defined roles, more hands mean more confusion. What matters first isn't how many there are, but that each person knows exactly what's theirs to do: receive, pack or coordinate.",
    stepsH2: "How to organize volunteers step by step",
    steps: [
      {
        name: "Define the three basic roles",
        text: "A volunteer who receives and records donations, a volunteer who packs and seals boxes, and a coordinator who consolidates pallets and manages shipments. You can get started with 2-3 volunteers and one coordinator.",
      },
      {
        name: "Give each volunteer their own account",
        text: "Each person operates with their own user, not a shared one. That way every action (register, seal, close a pallet) is attributed to whoever did it, with no ambiguity.",
      },
      {
        name: "Assign permissions by role",
        text: "The volunteer records and seals; the coordinator also closes pallets and shipments and generates manifests. Limiting permissions prevents irreversible mistakes under pressure.",
      },
      {
        name: "Keep every action traceable",
        text: "Every status change (box sealed, pallet closed, shipment dispatched) records who and when. That lets you audit the operation and resolve questions later.",
      },
    ],
    section3H2: "Why individual accounts matter",
    section3P:
      "Sharing a single “center” user saves a minute at the start and costs hours later: when something doesn't add up, no one knows who did it. With one account per volunteer and permissions by role, every action is attributed and the operation can be audited without pointing fingers blindly.",
    ctaTitle: "Organize your team with Araguaney",
    ctaPrimary: "Get started now",
    ctaSecondary: "Guide: organize a collection center",
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
  const ogImage = ogImageUrl(c.metaTitle, c.eyebrow)
  return {
    title: c.metaTitle,
    description: c.description,
    alternates: alternates(KEY, lang),
    openGraph: { title: `${c.metaTitle} — Araguaney`, description: c.description, images: [ogImage] },
    twitter: { card: "summary_large_image", title: `${c.metaTitle} — Araguaney`, description: c.description, images: [ogImage] },
  }
}

export default async function VoluntariosGuidePage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang: locale } = await params
  const dict = await getDictionary(locale)
  const c = CONTENT[locale]

  const path = localizedPath(KEY, locale)
  const crumbs = [
    { name: c.crumbHome, path: localizedPath("", locale) },
    { name: c.crumbGuides, path: localizedPath("guias", locale) },
    { name: c.metaTitle, path },
  ]

  const dates = CONTENT_DATES[KEY]
  const structuredData = [
    articleSchema({
      title: c.metaTitle,
      description: c.description,
      path,
      locale,
      datePublished: dates?.published,
      dateModified: dates?.modified,
    }),
    howToSchema({
      name: c.metaTitle,
      description: c.description,
      path,
      steps: c.steps,
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

            <h2 style={h2Style}>{c.section1H2}</h2>
            <p style={pStyle}>{c.section1P}</p>

            <h2 style={h2Style}>{c.stepsH2}</h2>
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

            <h2 style={h2Style}>{c.section3H2}</h2>
            <p style={pStyle}>{c.section3P}</p>

            <div
              className="mt-10 p-6 md:p-8 text-center"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
                {c.ctaTitle}
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <CtaLink
                  href="/login"
                  ctaLabel="guia_voluntarios_final"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  {c.ctaPrimary}
                </CtaLink>
                <Link
                  href={localizedPath("guias/como-organizar-un-centro-de-acopio", locale)}
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
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
