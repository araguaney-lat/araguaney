import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { FaqSection } from "@/components/FaqSection"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { type Locale, type RouteKey, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { faqSchema, breadcrumbSchema } from "@/lib/structured-data"

const KEY = "ayuda-humanitaria"

interface Scenario {
  icon: string
  title: string
  desc: string
  routeKey: RouteKey
}
interface Faq {
  q: string
  a: string
}
interface Content {
  metaTitle: string
  ogTitle: string
  ogImageTitle: string
  description: string
  ogEyebrow: string
  eyebrow: string
  h1: string
  heroP: string
  heroCta: string
  scenariosH2: string
  scenarios: Scenario[]
  standardH2: string
  standardP: string
  faqTitle: string
  faq: Faq[]
  finalH2: string
  finalCta: string
  crossCenterText: string
  crossCenterLink: string
  guide1Label: string
  guide1Href: string
  guide2Label: string
  guide2Href: string
  guideSuffix: string
  crumbHome: string
  crumbSelf: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Software de ayuda humanitaria",
    ogTitle: "Software de ayuda humanitaria — Araguaney",
    ogImageTitle: "Software de ayuda humanitaria",
    description:
      "¿Qué software sirve para donaciones de emergencia? Araguaney registra, empaca en cajas homogéneas con QR y genera manifiestos para cualquier escenario de ayuda humanitaria: sismos, inundaciones, crisis migratorias e incendios.",
    ogEyebrow: "Ayuda humanitaria",
    eyebrow: "Ayuda humanitaria",
    h1: "Software de ayuda humanitaria para cualquier tipo de emergencia",
    heroP:
      "Desde sismos hasta inundaciones, crisis migratorias o incendios: Araguaney estandariza el registro, empaque y envío de donaciones en especie para cualquier centro de acopio, en cualquier emergencia. No está atado a un solo evento.",
    heroCta: "Empezar ahora",
    scenariosH2: "Diseñado para cualquier escenario",
    scenarios: [
      { icon: "🌎", title: "Sismos", desc: "Coordina la recepción y envío de suministros entre centros tras un terremoto.", routeKey: "escenarios/sismo" },
      { icon: "🌊", title: "Inundaciones", desc: "Registra y clasifica donaciones a medida que llegan desde múltiples puntos de acopio.", routeKey: "escenarios/inundaciones" },
      { icon: "🧳", title: "Crisis migratorias", desc: "Estandariza el inventario de ayuda para poblaciones desplazadas en tránsito.", routeKey: "escenarios/crisis-migratoria" },
      { icon: "🔥", title: "Incendios", desc: "Organiza la respuesta rápida sin perder trazabilidad de lo que se dona y envía.", routeKey: "escenarios/incendios" },
    ],
    standardH2: "Un mismo estándar, cualquier emergencia",
    standardP:
      "Araguaney no está diseñado para un desastre específico. Registra donaciones por categoría, lote y caducidad, las empaca en cajas homogéneas con QR, y las consolida en tarimas y envíos con manifiesto exportable, apoyado en estándares reconocidos (OMS, IFRC/ICRC, IOM, UNSPSC, GS1) que garantizan la calidad del inventario sin importar el tipo de emergencia que lo origine.",
    faqTitle: "Preguntas frecuentes",
    faq: [
      { q: "¿Para qué tipo de emergencias sirve Araguaney?", a: "Para cualquier escenario de ayuda humanitaria: sismos, inundaciones, incendios o crisis migratorias. El estándar de registro, empaque y envío es el mismo, sin importar el evento." },
      { q: "¿Qué es una caja homogénea y por qué importa?", a: "Es una caja con un solo producto, un solo lote y una sola caducidad. Es lo que exige el régimen de envío humanitario para que la carga pueda verificarse en aduana sin abrirse, y no se atore." },
      { q: "¿Araguaney gestiona dinero o beneficiarios?", a: "No. Solo gestiona inventario de donaciones en especie, trazable de la caja al envío. No maneja donativos económicos ni registra datos de beneficiarios finales." },
      { q: "¿Cuánto cuesta?", a: "Es gratuito para centros de acopio y coordinaciones humanitarias, sin límite de cajas ni costo de licencia." },
    ],
    finalH2: "Prepárate antes de que llegue la próxima emergencia",
    finalCta: "Empezar ahora",
    crossCenterText: "¿Coordinas específicamente un centro de acopio? ",
    crossCenterLink: "Conoce el estándar completo →",
    guide1Label: "Qué se puede donar",
    guide1Href: "/guias/que-se-puede-donar",
    guide2Label: "Cómo preparar carga para aduana",
    guide2Href: "/guias/como-preparar-carga-humanitaria-para-aduana",
    guideSuffix: "",
    crumbHome: "Inicio",
    crumbSelf: "Ayuda humanitaria",
  },
  en: {
    metaTitle: "Humanitarian Aid Software",
    ogTitle: "Humanitarian Aid Software — Araguaney",
    ogImageTitle: "Humanitarian aid software",
    description:
      "What software works for emergency donations? Araguaney handles intake, homogeneous boxes with QR codes, and an exportable manifest for any humanitarian aid scenario: earthquakes, floods, migration crises, and fires.",
    ogEyebrow: "Humanitarian aid",
    eyebrow: "Humanitarian aid",
    h1: "Humanitarian aid software for any emergency scenario",
    heroP:
      "From earthquakes to floods, migration crises, or fires: Araguaney standardizes the intake, packing, and shipment of in-kind donations for any aid center, in any emergency. It's not tied to a single event.",
    heroCta: "Get started",
    scenariosH2: "Built for any scenario",
    scenarios: [
      { icon: "🌎", title: "Earthquakes", desc: "Coordinate intake and shipments across centers after a seismic event.", routeKey: "escenarios/sismo" },
      { icon: "🌊", title: "Floods", desc: "Register and classify donations as they arrive from multiple collection points.", routeKey: "escenarios/inundaciones" },
      { icon: "🧳", title: "Migration crises", desc: "Standardize aid inventory for displaced populations in transit.", routeKey: "escenarios/crisis-migratoria" },
      { icon: "🔥", title: "Fires", desc: "Organize a fast response without losing traceability of what's donated and shipped.", routeKey: "escenarios/incendios" },
    ],
    standardH2: "One standard, any emergency",
    standardP:
      "Araguaney isn't built for a specific disaster. It registers donations by category, batch, and expiry, packs them into homogeneous boxes with QR codes, and consolidates them into pallets and shipments with an exportable manifest, backed by recognized standards (WHO, IFRC/ICRC, IOM, UNSPSC, GS1) that ensure inventory quality no matter what kind of emergency triggered it.",
    faqTitle: "Frequently asked questions",
    faq: [
      { q: "What kinds of emergencies is Araguaney for?", a: "Any humanitarian aid scenario: earthquakes, floods, wildfires or migration crises. The standard for registering, packing and shipping donations is the same, regardless of the event." },
      { q: "What is a homogeneous box and why does it matter?", a: "A box holding a single product, a single batch and a single expiry date. It is what the humanitarian shipping regime requires so cargo can be verified at customs without being opened, and doesn't get stuck." },
      { q: "Does Araguaney handle money or beneficiaries?", a: "No. It only manages in-kind donation inventory, traceable from box to shipment. It does not handle cash donations or store final-beneficiary data." },
      { q: "How much does it cost?", a: "It is free for collection centers and humanitarian coordinations: no box limit and no license fee." },
    ],
    finalH2: "Get ready before the next emergency hits",
    finalCta: "Get started",
    crossCenterText: "Coordinating a donation center specifically? ",
    crossCenterLink: "See the full standard (Spanish) →",
    guide1Label: "What can be donated",
    guide1Href: "/guias/que-se-puede-donar",
    guide2Label: "Preparing cargo for customs",
    guide2Href: "/guias/como-preparar-carga-humanitaria-para-aduana",
    guideSuffix: " (Spanish)",
    crumbHome: "Home",
    crumbSelf: "Humanitarian aid",
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
  const { lang } = await params
  const c = CONTENT[lang]
  const ogImage = ogImageUrl(c.ogImageTitle, c.ogEyebrow)
  return {
    title: c.metaTitle,
    description: c.description,
    alternates: alternates(KEY, lang),
    openGraph: { title: c.ogTitle, description: c.description, images: [ogImage] },
    twitter: { card: "summary_large_image", title: c.ogTitle, description: c.description, images: [ogImage] },
  }
}

export default async function AyudaHumanitariaPage({
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
  const structuredData = [faqSchema(c.faq), breadcrumbSchema(crumbs)]

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

        {/* ── Hero ── */}
        <div className="px-5 md:px-[46px] pt-[26px] md:pt-[64px] pb-10 md:pb-[56px]">
          <div className="max-w-[720px]">
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
              className="text-[30px] md:text-[46px] mb-4"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.3px", margin: "0 0 16px" }}
            >
              {c.h1}
            </h1>
            <p className="text-[14.5px] md:text-[17px] mb-8" style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: 560 }}>
              {c.heroP}
            </p>
            <CtaLink
              href="/login"
              ctaLabel="ayuda_humanitaria_hero"
              className="inline-flex items-center justify-center px-[26px] py-[14px]"
              style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 15, boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)", borderRadius: 99 }}
            >
              {c.heroCta}
            </CtaLink>
          </div>
        </div>

        {/* ── Scenarios ── */}
        <div className="px-5 md:px-[46px] py-12 md:py-[64px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[880px] mx-auto">
            <h2 className="text-[22px] md:text-[30px] mb-8 md:mb-10" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 32px" }}>
              {c.scenariosH2}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {c.scenarios.map((item) => (
                <Link key={item.title} href={localizedPath(item.routeKey, locale)} className="flex gap-4 items-start p-5" style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#FCFAF4" }}>
                  <span className="text-[26px] flex-none leading-none mt-0.5">{item.icon}</span>
                  <div>
                    <h3 className="text-[15px] md:text-[16px] mb-1.5" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#1F5E8C", margin: "0 0 6px" }}>
                      {item.title} →
                    </h3>
                    <p className="text-[13px] md:text-[14px]" style={{ margin: 0, color: "#6E6557", lineHeight: 1.55 }}>
                      {item.desc}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── One standard ── */}
        <div className="px-5 md:px-[46px] py-10 md:py-[56px]" style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[22px] md:text-[28px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
              {c.standardH2}
            </h2>
            <p className="text-[14.5px] md:text-[16px]" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.standardP}
            </p>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="px-5 md:px-[46px] py-12 md:py-[56px]" style={{ borderTop: "1px solid #EFE7D6" }}>
          <FaqSection items={c.faq} title={c.faqTitle} />
        </div>

        {/* ── Final CTA + cross-links ── */}
        <div className="px-5 md:px-[46px] py-12 md:py-[64px] text-center" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <h2 className="text-[22px] md:text-[28px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
            {c.finalH2}
          </h2>
          <CtaLink
            href="/login"
            ctaLabel="ayuda_humanitaria_final"
            className="inline-flex items-center justify-center px-[26px] py-[14px] mb-4"
            style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 15, borderRadius: 99, boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)" }}
          >
            {c.finalCta}
          </CtaLink>
          <p className="text-[13.5px] mb-2" style={{ color: "#6E6557" }}>
            {c.crossCenterText}
            <Link href={localizedPath("centro-de-acopio", locale)} style={{ color: "#1F5E8C", fontWeight: 600 }}>
              {c.crossCenterLink}
            </Link>
          </p>
          <p className="text-[13.5px]" style={{ color: "#6E6557" }}>
            <Link href={c.guide1Href} style={{ color: "#1F5E8C", fontWeight: 600 }}>
              {c.guide1Label}
            </Link>
            {" · "}
            <Link href={c.guide2Href} style={{ color: "#1F5E8C", fontWeight: 600 }}>
              {c.guide2Label}
            </Link>
            {c.guideSuffix}
          </p>
        </div>

        <HomeFooter dict={dict.footer} locale={locale} />
      </div>
    </>
  )
}
