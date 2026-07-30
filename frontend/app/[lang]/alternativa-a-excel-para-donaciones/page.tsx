import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { FaqSection } from "@/components/FaqSection"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { faqSchema, breadcrumbSchema } from "@/lib/structured-data"

const KEY = "alternativa-a-excel-para-donaciones"

interface Problem {
  icon: string
  title: string
  desc: string
}
interface Row {
  cap: string
  sheet: string
  ara: string
}
interface Faq {
  q: string
  a: string
}
interface Content {
  metaTitle: string
  ogTitle: string
  description: string
  ogEyebrow: string
  eyebrow: string
  h1: string
  heroP: string
  heroCta: string
  problemH2: string
  problemP: string
  problems: Problem[]
  tableH2: string
  tableIntro: string
  colCap: string
  colSheet: string
  colAra: string
  rows: Row[]
  whenH2: string
  whenP1: string
  whenP2: string
  faqTitle: string
  faq: Faq[]
  finalH2: string
  finalCta: string
  crossPillarText: string
  crossPillarLink: string
  crossPillarHref: string
  crossGuideLink: string
  crossGuideHref: string
  crumbHome: string
  crumbSelf: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Alternativa a Excel para gestionar donaciones",
    ogTitle: "Alternativa a Excel para donaciones — Araguaney",
    description:
      "¿Excel o WhatsApp para tu centro de acopio? Compara la hoja de cálculo con Araguaney: trazabilidad, QR, manifiesto para aduana, validación OMS y panel nacional, gratis.",
    ogEyebrow: "Comparativa",
    eyebrow: "Excel vs Araguaney",
    h1: "La alternativa a la hoja de cálculo para gestionar donaciones en especie",
    heroP:
      "Excel, Google Sheets y los grupos de WhatsApp funcionan hasta que llega el primer envío grande: sin trazabilidad, sin QR, sin manifiesto y sin forma de sumar el stock entre centros. Araguaney hace exactamente eso, con el estándar que ya usan decenas de centros de acopio, y es gratis.",
    heroCta: "Empezar gratis",
    problemH2: "Por qué la hoja de cálculo se queda corta",
    problemP:
      "Una hoja alcanza para anotar cuatro cajas. Pero un centro de acopio real recibe cientos de ítems con lotes y caducidades distintas, tiene que preparar envíos que cumplan el régimen de aduana y, si coordina con otros centros, necesita saber qué hay a nivel nacional. Ahí la hoja se rompe:",
    problems: [
      { icon: "🕳️", title: "Cero trazabilidad", desc: "Una celda no sabe qué caja fue a qué tarima ni a qué envío. Cuando algo se pierde, nadie puede rastrearlo." },
      { icon: "⏳", title: "No valida caducidad ni controlados", desc: "Nada impide sellar un medicamento vencido o una sustancia controlada. La hoja no conoce las reglas de la OMS." },
      { icon: "🏷️", title: "Sin QR ni etiqueta", desc: "No genera códigos ni etiquetas: cada caja se rotula a mano, sin identificación única." },
      { icon: "📄", title: "Sin manifiesto para aduana", desc: "El packing list se arma a mano, con errores, y rara vez cumple lo que exige un envío humanitario." },
      { icon: "🔀", title: "Caos de versiones", desc: "«acopio_final_v3_REAL.xlsx». Varias personas editando, copias que no cuadran, datos que se pisan." },
      { icon: "🌎", title: "No suma entre centros", desc: "Cada hoja es una isla. Es imposible ver el stock nacional o saber qué falta dónde." },
    ],
    tableH2: "Hoja de cálculo vs Araguaney, lado a lado",
    tableIntro:
      "Lo que hace cada una cuando el acopio deja de ser un puñado de cajas.",
    colCap: "Capacidad",
    colSheet: "Hoja de cálculo / WhatsApp",
    colAra: "Araguaney",
    rows: [
      { cap: "Registro por ítem (categoría, lote, caducidad)", sheet: "Manual, sin estructura", ara: "Estructurado y validado" },
      { cap: "Validación de caducidad y reglas OMS", sheet: "No", ara: "Sí, automática" },
      { cap: "Bloqueo de medicamentos controlados", sheet: "No", ara: "Sí, en el intake" },
      { cap: "QR + etiqueta por caja", sheet: "No", ara: "Generados al sellar" },
      { cap: "Manifiesto / packing list para aduana", sheet: "A mano, con errores", ara: "Exportable en un clic" },
      { cap: "Trazabilidad caja → tarima → envío", sheet: "No", ara: "De punta a punta" },
      { cap: "Panel nacional agregado en tiempo real", sheet: "No", ara: "Sí" },
      { cap: "Coordinación entre varios centros", sheet: "Cada hoja es una isla", ara: "Un mismo estándar" },
      { cap: "Datos personales al mínimo", sheet: "Depende de quién la llene", ara: "Cero de beneficiarios; del donante, con plazo y purga" },
      { cap: "Costo", sheet: "«Gratis», pero cuesta en errores", ara: "Gratis, sin límite de cajas" },
    ],
    whenH2: "¿Cuándo alcanza una hoja de cálculo?",
    whenP1:
      "Seamos honestos: si estás juntando unas cuantas cajas para un envío único y pequeño, una hoja de cálculo está perfectamente bien. No necesitas un sistema para eso, y montar uno sería sobre-ingeniería.",
    whenP2:
      "Araguaney tiene sentido cuando el acopio se vuelve serio: cuando recibes inventario a diario, cuando tus envíos tienen que pasar por aduana con un manifiesto formal, o cuando coordinas con otros centros y necesitan hablar el mismo idioma. Ahí el orden deja de ser un lujo y pasa a ser lo que hace que la ayuda llegue.",
    faqTitle: "Preguntas frecuentes",
    faq: [
      { q: "¿Excel sirve para gestionar donaciones en especie?", a: "Para un acopio pequeño y puntual, sí. Pero no valida caducidad ni sustancias controladas, no genera QR ni manifiestos para aduana, no da trazabilidad de la caja al envío y no permite sumar el stock entre varios centros. En cuanto el acopio crece, esas ausencias frenan los envíos." },
      { q: "¿Cuál es el mejor software para un centro de acopio?", a: "El que estandariza el registro por ítem, garantiza la caja homogénea con QR, produce el manifiesto exportable y agrega el stock a nivel nacional, sin cobrar por caja y pidiendo del donante solo lo mínimo, cuando quiere identificarse. Araguaney está construido exactamente para eso y es gratuito." },
      { q: "¿Cuánto cuesta Araguaney?", a: "Es gratuito para centros de acopio y coordinaciones humanitarias: registro por ítem, cajas con QR, manifiestos y panel agregado, sin costo de licencia ni límite de cajas." },
      { q: "¿Cómo migro desde mi hoja de cálculo?", a: "No hay una importación masiva: empiezas a registrar el inventario nuevo directamente en Araguaney a medida que entra. Como el registro es por ítem y guiado, en la práctica es más rápido que mantener la hoja al día." },
    ],
    finalH2: "Deja la hoja de cálculo. Empieza con el estándar.",
    finalCta: "Empezar gratis",
    crossPillarText: "¿Quieres ver todo lo que hace por un centro de acopio? ",
    crossPillarLink: "Software para centro de acopio →",
    crossPillarHref: "/centro-de-acopio",
    crossGuideLink: "Guía: software gratis para gestionar donaciones en una ONG →",
    crossGuideHref: "/guias/software-gratis-para-gestionar-donaciones-ong",
    crumbHome: "Inicio",
    crumbSelf: "Alternativa a Excel",
  },
  en: {
    metaTitle: "A donation spreadsheet alternative",
    ogTitle: "A donation spreadsheet alternative — Araguaney",
    description:
      "Excel or WhatsApp for your aid center? Compare the spreadsheet with Araguaney: traceability, QR codes, a customs manifest, WHO validation and a national dashboard, free.",
    ogEyebrow: "Comparison",
    eyebrow: "Spreadsheet vs Araguaney",
    h1: "The spreadsheet alternative for managing in-kind donations",
    heroP:
      "Excel, Google Sheets and WhatsApp groups work until the first big shipment: no traceability, no QR codes, no manifest, and no way to add up stock across centers. Araguaney does exactly that, with the standard dozens of aid centers already use, and it's free.",
    heroCta: "Start free",
    problemH2: "Why a spreadsheet falls short",
    problemP:
      "A spreadsheet is fine for four boxes. But a real aid center takes in hundreds of items with different batches and expiry dates, has to prepare shipments that clear customs, and (if it coordinates with other centers) needs to know what's available nationally. That's where the spreadsheet breaks:",
    problems: [
      { icon: "🕳️", title: "No traceability", desc: "A cell doesn't know which box went to which pallet or shipment. When something goes missing, no one can track it." },
      { icon: "⏳", title: "No expiry or controlled-item checks", desc: "Nothing stops you sealing an expired medicine or a controlled substance. A spreadsheet doesn't know WHO rules." },
      { icon: "🏷️", title: "No QR or label", desc: "It generates no codes or labels: every box is marked by hand, with no unique identifier." },
      { icon: "📄", title: "No customs manifest", desc: "The packing list is built by hand, with errors, and rarely meets what a humanitarian shipment requires." },
      { icon: "🔀", title: "Version chaos", desc: "“intake_final_v3_REAL.xlsx”. Several people editing, copies that don't match, data overwritten." },
      { icon: "🌎", title: "No cross-center totals", desc: "Every sheet is an island. Seeing national stock or knowing what's needed where is impossible." },
    ],
    tableH2: "Spreadsheet vs Araguaney, side by side",
    tableIntro: "What each one does once intake stops being a handful of boxes.",
    colCap: "Capability",
    colSheet: "Spreadsheet / WhatsApp",
    colAra: "Araguaney",
    rows: [
      { cap: "Item-level intake (category, batch, expiry)", sheet: "Manual, unstructured", ara: "Structured and validated" },
      { cap: "Expiry and WHO rule validation", sheet: "No", ara: "Yes, automatic" },
      { cap: "Blocking of controlled medicines", sheet: "No", ara: "Yes, at intake" },
      { cap: "QR + label per box", sheet: "No", ara: "Generated on sealing" },
      { cap: "Customs manifest / packing list", sheet: "By hand, error-prone", ara: "Exportable in one click" },
      { cap: "Traceability box → pallet → shipment", sheet: "No", ara: "End to end" },
      { cap: "Real-time national dashboard", sheet: "No", ara: "Yes" },
      { cap: "Coordination across centers", sheet: "Every sheet is an island", ara: "One shared standard" },
      { cap: "Personal data kept minimal", sheet: "Depends who fills it in", ara: "None on recipients; donor data with retention and purge" },
      { cap: "Cost", sheet: "“Free”, but costs in errors", ara: "Free, no box limit" },
    ],
    whenH2: "When is a spreadsheet enough?",
    whenP1:
      "Let's be honest: if you're gathering a few boxes for a single small shipment, a spreadsheet is perfectly fine. You don't need a system for that, and setting one up would be over-engineering.",
    whenP2:
      "Araguaney makes sense when intake gets serious: when you receive inventory daily, when your shipments must clear customs with a formal manifest, or when you coordinate with other centers that need to speak the same language. That's where order stops being a luxury and becomes what gets aid delivered.",
    faqTitle: "Frequently asked questions",
    faq: [
      { q: "Can Excel manage in-kind donations?", a: "For a small, one-off intake, yes. But it doesn't validate expiry or controlled substances, generate QR codes or customs manifests, give box-to-shipment traceability, or add up stock across several centers. As soon as intake grows, those gaps stall shipments." },
      { q: "What is the best software for an aid collection center?", a: "The one that standardizes item-level intake, guarantees the homogeneous box with a QR code, produces the exportable manifest, and aggregates stock nationally, without charging per box, asking donors only for the minimum and only when they choose to identify themselves. Araguaney is built for exactly that, and it's free." },
      { q: "How much does Araguaney cost?", a: "It's free for collection centers and humanitarian coordinations: item-level intake, boxes with QR, manifests and an aggregated dashboard, with no license fee and no box limit." },
      { q: "How do I migrate from my spreadsheet?", a: "There's no bulk import: you start registering new inventory directly in Araguaney as it comes in. Because intake is item-level and guided, in practice it's faster than keeping the spreadsheet up to date." },
    ],
    finalH2: "Drop the spreadsheet. Start with the standard.",
    finalCta: "Start free",
    crossPillarText: "Want to see everything it does for a collection center? ",
    crossPillarLink: "Collection center software →",
    crossPillarHref: "/humanitarian-aid",
    crossGuideLink: "Guide: free donation software for an NGO →",
    crossGuideHref: "/guias/software-gratis-para-gestionar-donaciones-ong",
    crumbHome: "Home",
    crumbSelf: "Spreadsheet alternative",
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

export default async function SpreadsheetAlternativePage({
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
              href={localizedPath("registrar-centro", locale)}
              ctaLabel="comparativa_hero"
              className="inline-flex items-center justify-center px-[26px] py-[14px]"
              style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 15, boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)", borderRadius: 99 }}
            >
              {c.heroCta}
            </CtaLink>
          </div>
        </div>

        {/* ── Problem ── */}
        <div className="px-5 md:px-[46px] py-10 md:py-[56px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[880px] mx-auto">
            <h2 className="text-[22px] md:text-[30px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
              {c.problemH2}
            </h2>
            <p className="text-[14.5px] md:text-[16px] mb-8 md:mb-10" style={{ color: "#5C5347", lineHeight: 1.65, maxWidth: 620 }}>
              {c.problemP}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {c.problems.map((item) => (
                <div key={item.title} className="flex gap-4 items-start p-5" style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#FBF7EE" }}>
                  <span className="text-[26px] flex-none leading-none mt-0.5">{item.icon}</span>
                  <div>
                    <h3 className="text-[15px] md:text-[16px] mb-1.5" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723", margin: "0 0 6px" }}>
                      {item.title}
                    </h3>
                    <p className="text-[13px] md:text-[14px]" style={{ margin: 0, color: "#6E6557", lineHeight: 1.55 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Comparison table ── */}
        <div className="px-5 md:px-[46px] py-12 md:py-[64px]" style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[880px] mx-auto">
            <h2 className="text-[22px] md:text-[30px] mb-3" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 12px" }}>
              {c.tableH2}
            </h2>
            <p className="text-[14px] md:text-[15px] mb-6 md:mb-8" style={{ color: "#6E6557", lineHeight: 1.55, maxWidth: 560 }}>
              {c.tableIntro}
            </p>
            <div style={{ overflowX: "auto", border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}>
              <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #EEE6D4" }}>
                    <th scope="col" style={{ textAlign: "left", padding: "14px 16px", color: "#2B2723", fontWeight: 700 }}>{c.colCap}</th>
                    <th scope="col" style={{ textAlign: "left", padding: "14px 16px", color: "#6E6557", fontWeight: 600 }}>{c.colSheet}</th>
                    <th scope="col" style={{ textAlign: "left", padding: "14px 16px", color: "#1F5E8C", fontWeight: 700 }}>{c.colAra}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map((r, i) => (
                    <tr key={r.cap} style={{ borderTop: i === 0 ? "none" : "1px solid #F1EAD9" }}>
                      <th scope="row" style={{ textAlign: "left", padding: "12px 16px", color: "#2B2723", fontWeight: 600, lineHeight: 1.4 }}>{r.cap}</th>
                      <td style={{ padding: "12px 16px", color: "#8A8073", lineHeight: 1.4 }}>{r.sheet}</td>
                      <td style={{ padding: "12px 16px", color: "#2B2723", fontWeight: 600, lineHeight: 1.4 }}>{r.ara}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── When a spreadsheet is enough (honest) ── */}
        <div className="px-5 md:px-[46px] py-10 md:py-[56px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[22px] md:text-[30px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
              {c.whenH2}
            </h2>
            <p className="text-[14.5px] md:text-[16px] mb-4" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.whenP1}
            </p>
            <p className="text-[14.5px] md:text-[16px]" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.whenP2}
            </p>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="px-5 md:px-[46px] py-12 md:py-[56px]" style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}>
          <FaqSection items={c.faq} title={c.faqTitle} />
        </div>

        {/* ── Final CTA + cross-links ── */}
        <div className="px-5 md:px-[46px] py-12 md:py-[64px] text-center" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <h2 className="text-[22px] md:text-[28px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
            {c.finalH2}
          </h2>
          <CtaLink
            href={localizedPath("registrar-centro", locale)}
            ctaLabel="comparativa_final"
            className="inline-flex items-center justify-center px-[26px] py-[14px] mb-4"
            style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 15, borderRadius: 99, boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)" }}
          >
            {c.finalCta}
          </CtaLink>
          <p className="text-[13.5px] mb-2" style={{ color: "#6E6557" }}>
            {c.crossPillarText}
            <Link href={c.crossPillarHref} style={{ color: "#1F5E8C", fontWeight: 600 }}>
              {c.crossPillarLink}
            </Link>
          </p>
          <p className="text-[13.5px]" style={{ color: "#6E6557" }}>
            <Link href={c.crossGuideHref} style={{ color: "#1F5E8C", fontWeight: 600 }}>
              {c.crossGuideLink}
            </Link>
          </p>
        </div>

        <HomeFooter dict={dict.footer} locale={locale} />
      </div>
    </>
  )
}
