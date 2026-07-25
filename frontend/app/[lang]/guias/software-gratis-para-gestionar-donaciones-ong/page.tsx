import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { FaqSection } from "@/components/FaqSection"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { CONTENT_DATES, formatContentDate, updatedLabel, authorByline } from "@/lib/content-dates"
import { type Locale, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { articleSchema, faqSchema, breadcrumbSchema } from "@/lib/structured-data"

const KEY = "guias/software-gratis-para-gestionar-donaciones-ong"

interface Criterio {
  title: string
  desc: string
}
interface Faq {
  q: string
  a: string
}
interface Content {
  metaTitle: string
  description: string
  ogEyebrow: string
  eyebrow: string
  h1: string
  intro: string
  criteriosH2: string
  criterios: Criterio[]
  whyH2: string
  whyP: string
  faqTitle: string
  faq: Faq[]
  ctaHeading: string
  ctaStart: string
  ctaStandard: string
  relatedCompare: string
  crumbHome: string
  crumbGuides: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Software gratis para gestionar donaciones en una ONG",
    description:
      "Qué buscar en un software para gestionar donaciones en especie sin costo: registro por ítem, trazabilidad, manifiesto y agregación entre centros.",
    ogEyebrow: "Guía",
    eyebrow: "Guía",
    h1: "Software gratis para gestionar donaciones en una ONG",
    intro:
      "Cuando una ONG o un centro de acopio empieza a recibir donaciones en especie, la primera herramienta suele ser una hoja de cálculo. Funciona hasta que deja de funcionar: no valida caducidades, no genera etiquetas ni manifiestos, y no permite ver el inventario de varios puntos a la vez. Esta guía explica qué buscar en un software gratuito que sí resuelva eso.",
    criteriosH2: "Qué debe hacer un buen software de donaciones",
    criterios: [
      { title: "Registro por ítem, no por bulto", desc: "Que capture cada donación con categoría, lote y caducidad — no solo \"3 cajas\". Sin esto no hay visibilidad real del inventario." },
      { title: "Trazabilidad de la caja al envío", desc: "Que cada caja, tarima y envío tenga su código y su historial de estados, para saber siempre dónde está cada cosa." },
      { title: "Manifiesto exportable", desc: "Que genere el packing list para aduana automáticamente, sin recapturar datos." },
      { title: "Reglas de donación integradas", desc: "Que valide caducidad y bloquee lo que no se puede donar (medicamentos vencidos, controlados) en el momento del registro." },
      { title: "Sin datos personales de por medio", desc: "Que no te obligue a registrar PII de donantes o beneficiarios — menos riesgo legal y menos fricción." },
      { title: "Agregación entre centros", desc: "Si operas más de un punto, que sume el stock de todos en un panel único. Es la diferencia entre un inventario y una coordinación." },
    ],
    whyH2: "Por qué \"gratis\" no debería significar \"básico\"",
    whyP:
      "Un software gratuito para el sector humanitario no tiene por qué ser una versión recortada. Araguaney es gratis para centros de acopio y ofrece el estándar completo: registro por ítem, cajas homogéneas con QR, tarimas, envíos con manifiesto exportable y un panel nacional que suma el stock de todos los centros. Sin licencias, sin límite de cajas, sin instalar servidores.",
    faqTitle: "Preguntas frecuentes",
    faq: [
      { q: "¿Existe software gratis para gestionar donaciones en especie?", a: "Sí. Araguaney es gratuito para centros de acopio y coordinaciones humanitarias: registro por ítem, cajas con QR, manifiestos y panel agregado nacional, sin costo de licencia." },
      { q: "¿Sirve una hoja de cálculo en vez de un software?", a: "Para un solo centro pequeño y por poco tiempo, puede alcanzar. Pero una hoja no valida reglas de donación, no genera QR ni manifiestos, y no agrega el stock de varios centros — que es justo lo que se necesita cuando la operación crece." },
      { q: "¿Necesito instalar algo o servidores propios?", a: "No. Araguaney es una aplicación web: entras desde el navegador. El registro de donaciones incluso funciona sin conexión y sincroniza al recuperar internet." },
      { q: "¿Puedo usarlo para cualquier tipo de emergencia?", a: "Sí. Aunque nació de un contexto específico, el estándar es genérico: sismos, inundaciones, incendios o crisis migratorias. No está atado a un solo evento." },
    ],
    ctaHeading: "Empieza a gestionar tus donaciones con Araguaney, gratis",
    ctaStart: "Empezar ahora",
    ctaStandard: "Ver el estándar completo",
    relatedCompare: "¿Vienes de una hoja de cálculo? Mira Excel vs Araguaney lado a lado →",
    crumbHome: "Inicio",
    crumbGuides: "Guías",
  },
  en: {
    metaTitle: "Free software to manage in-kind donations at an NGO",
    description:
      "What to look for in free software to manage in-kind donations: item-level intake, traceability, manifests, and aggregation across centers.",
    ogEyebrow: "Guide",
    eyebrow: "Guide",
    h1: "Free software to manage in-kind donations at an NGO",
    intro:
      "When an NGO or a collection center starts receiving in-kind donations, the first tool is usually a spreadsheet. It works until it doesn't: it doesn't validate expiry dates, it doesn't generate labels or manifests, and it doesn't let you see the inventory of several points at once. This guide explains what to look for in free software that actually solves that.",
    criteriosH2: "What a good donation software should do",
    criterios: [
      { title: "Item-level intake, not by bulk", desc: "It should capture each donation with category, batch and expiry — not just \"3 boxes\". Without this there's no real inventory visibility." },
      { title: "Traceability from box to shipment", desc: "Every box, pallet and shipment should have its code and its status history, so you always know where each thing is." },
      { title: "Exportable manifest", desc: "It should generate the customs packing list automatically, without re-entering data." },
      { title: "Built-in donation rules", desc: "It should validate expiry and block what can't be donated (expired or controlled medicines) at the moment of intake." },
      { title: "No personal data involved", desc: "It shouldn't force you to record donor or beneficiary PII — less legal risk and less friction." },
      { title: "Aggregation across centers", desc: "If you run more than one point, it should add up the stock of all of them in a single dashboard. That's the difference between an inventory and a coordination." },
    ],
    whyH2: "Why \"free\" shouldn't mean \"basic\"",
    whyP:
      "Free software for the humanitarian sector doesn't have to be a stripped-down version. Araguaney is free for collection centers and offers the full standard: item-level intake, homogeneous boxes with QR codes, pallets, shipments with an exportable manifest, and a national dashboard that adds up the stock of every center. No licenses, no box limit, no servers to install.",
    faqTitle: "Frequently asked questions",
    faq: [
      { q: "Is there free software to manage in-kind donations?", a: "Yes. Araguaney is free for collection centers and humanitarian coordinations: item-level intake, boxes with QR, manifests and a national aggregated dashboard, with no license fee." },
      { q: "Is a spreadsheet enough instead of software?", a: "For a single small center and a short time, it might be enough. But a spreadsheet doesn't validate donation rules, doesn't generate QR codes or manifests, and doesn't aggregate the stock of several centers — which is exactly what's needed when the operation grows." },
      { q: "Do I need to install anything or run my own servers?", a: "No. Araguaney is a web application: you access it from the browser. Donation intake even works offline and syncs when the connection is back." },
      { q: "Can I use it for any kind of emergency?", a: "Yes. Although it was born from a specific context, the standard is generic: earthquakes, floods, fires or migration crises. It isn't tied to a single event." },
    ],
    ctaHeading: "Start managing your donations with Araguaney, free",
    ctaStart: "Get started now",
    ctaStandard: "See the full standard",
    relatedCompare: "Coming from a spreadsheet? See Spreadsheet vs Araguaney side by side →",
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

export default async function SoftwareGratisGuidePage({
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

            <h2 style={h2Style}>{c.criteriosH2}</h2>
            <div className="space-y-4 mb-8 mt-2">
              {c.criterios.map((item) => (
                <div key={item.title} className="p-4" style={{ border: "1px solid #EEE6D4", borderRadius: 12, background: "#fff" }}>
                  <p className="text-[14px] font-semibold mb-1" style={{ color: "#2B2723" }}>{item.title}</p>
                  <p className="text-[13.5px]" style={{ margin: 0, color: "#6E6557", lineHeight: 1.55 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <h2 style={h2Style}>{c.whyH2}</h2>
            <p style={pStyle}>{c.whyP}</p>

            <div className="mt-10">
              <FaqSection items={c.faq} title={c.faqTitle} />
            </div>

            <div
              className="mt-10 p-6 md:p-8 text-center"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
                {c.ctaHeading}
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <CtaLink
                  href="/login"
                  ctaLabel="guia_software_gratis_final"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  {c.ctaStart}
                </CtaLink>
                <Link
                  href={localizedPath("centro-de-acopio", locale)}
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  {c.ctaStandard}
                </Link>
              </div>
            </div>

            <p className="mt-6 text-[13.5px] text-center" style={{ color: "#6E6557" }}>
              <Link
                href={localizedPath("alternativa-a-excel-para-donaciones", locale)}
                style={{ color: "#1F5E8C", fontWeight: 600 }}
              >
                {c.relatedCompare}
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
