import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { howToSchema, breadcrumbSchema, type Schema } from "@/lib/structured-data"

const KEY = "como-funciona"

// ── Locale-independent structural data ────────────────────────────────────────
// SVG pipeline paths, rule numbers and standard codes never change between
// languages, so they live outside CONTENT and get zipped with localized copy.
const STAGE_D = [
  "M3 12h4l2 3h6l2-3h4 M5 12V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6 M3 12v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5",
  "M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z M3 7.5 12 12l9-4.5 M12 12v9",
  "M4 5h16v4H4z M4 11h16v4H4z M7 15v4 M17 15v4 M7 19h10",
  "M3 6h11v9H3z M14 9h4l3 3v3h-7z M7 18a1.6 1.6 0 1 0 .01 0 M17.5 18a1.6 1.6 0 1 0 .01 0",
  "M6 3h9l4 4v14H6z M14 3v5h5 M9 13h7 M9 17h7",
] as const

const RULE_N = ["01", "02", "03", "04"] as const
const STANDARD_A = ["WHO", "IFRC/ICRC", "IOM", "UNSPSC", "GS1"] as const

interface Stage {
  title: string
  desc: string
}
interface Concept {
  h: string
  p: string
}
interface Track {
  name: string
  steps: [string, string, string]
}
interface Rule {
  h: string
  p: string
}
interface Section {
  eyebrow: string
  h2: string
  note: string
}
interface Content {
  metaTitle: string
  ogTitle: string
  description: string
  ogEyebrow: string
  heroEyebrow: string
  h1: string
  heroP: string
  heroPills: string[]
  flow: Section
  stages: Stage[]
  concepts: Section
  conceptItems: Concept[]
  traceability: Section
  tracks: Track[]
  rules: Section
  ruleItems: Rule[]
  standards: Section
  standardItems: string[]
  ctaH2: string
  ctaP: string
  ctaPrimary: string
  ctaSecondary: string
  howToName: string
  crumbHome: string
  crumbSelf: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Cómo funciona Araguaney",
    ogTitle: "Cómo funciona Araguaney — Araguaney",
    description:
      "¿Cómo funciona Araguaney, del acopio al envío? Registrar donaciones por ítem, empacarlas en cajas homogéneas con QR, consolidarlas en tarimas y envíos con manifiesto, y ver el stock nacional en tiempo real.",
    ogEyebrow: "Cómo funciona",
    heroEyebrow: "Cómo funciona",
    h1: "Que cada donación llegue ordenada",
    heroP:
      "Araguaney le da a los centros de acopio un mismo estándar para recibir donaciones en especie, empacarlas con control de calidad y prepararlas para enviar — con trazabilidad de la caja al envío y un panel que suma el stock de todos los centros.",
    heroPills: ["Gratis para centros de acopio", "Para cualquier emergencia", "Sin datos personales"],
    flow: {
      eyebrow: "El flujo",
      h2: "Del acopio al envío, en cinco pasos",
      note: "Cada donación recorre el mismo camino. El orden es lo que hace que la carga no se atore: nada avanza hasta que la pieza anterior está lista.",
    },
    stages: [
      { title: "Recepción", desc: "Se registra la donación por ítem: producto, cantidad, lote, caducidad." },
      { title: "Caja", desc: "Un producto, un lote, una caducidad. Se sella con QR y etiqueta." },
      { title: "Tarima", desc: "Agrupa cajas selladas. Puede ser mixta. También tiene su QR." },
      { title: "Envío", desc: "Agrupa tarimas cerradas. Al despacharse, se congela todo." },
      { title: "Manifiesto", desc: "Packing list exportable, caja por caja, listo para aduana." },
    ],
    concepts: {
      eyebrow: "Las piezas",
      h2: "Un vocabulario común para todos los centros",
      note: "La razón por la que el stock de decenas de centros se puede sumar es que todos hablan el mismo idioma.",
    },
    conceptItems: [
      { h: "Caja homogénea", p: "Un solo producto, un solo lote y una sola caducidad por caja. Es lo que permite verificar el contenido sin abrirla — el requisito clave del envío humanitario." },
      { h: "Tarima", p: "Agrupa cajas selladas para transporte. Puede llevar distintos productos. Tiene su propio código QR para seguirla." },
      { h: "Envío", p: "Agrupa tarimas y genera el manifiesto. Al despacharse, congela su contenido para conservar la trazabilidad." },
      { h: "Panel nacional", p: "Suma el stock disponible de todos los centros conectados: qué hay, cuánto y dónde, en tiempo real." },
    ],
    traceability: {
      eyebrow: "Trazabilidad",
      h2: "Cada pieza deja rastro",
      note: "Las cajas, tarimas y envíos avanzan por estados en un solo sentido, y cada cambio queda registrado. Así siempre se sabe dónde está cada cosa.",
    },
    tracks: [
      { name: "Caja", steps: ["Registrada", "Sellada", "Enviada"] },
      { name: "Tarima", steps: ["Abierta", "Cerrada", "Enviada"] },
      { name: "Envío", steps: ["Abierto", "Cerrado", "Despachado"] },
    ],
    rules: {
      eyebrow: "Control de calidad",
      h2: "Reglas que el sistema aplica solo",
      note: "Araguaney valida cada donación al registrarla, para que no se prepare ni se envíe lo que no debería.",
    },
    ruleItems: [
      { h: "Caja homogénea", p: "Una caja lleva un solo producto, lote y caducidad. Si llega una mezcla, se separa en varias cajas." },
      { h: "Vida útil mínima", p: "Medicamentos: al menos 365 días restantes (lineamientos de la OMS). Alimentos y agua: al menos 180 días. Por debajo, la donación se rechaza." },
      { h: "Medicamentos identificados", p: "Se exige denominación (INN), forma, concentración y lote. Sin eso, no se puede sellar." },
      { h: "Controlados bloqueados", p: "Los productos controlados se rechazan al momento de recibir, sin excepción." },
    ],
    standards: {
      eyebrow: "Respaldo",
      h2: "Estándares que respaldamos",
      note: "La calidad y la trazabilidad no las inventamos: se apoyan en estándares abiertos y reconocidos.",
    },
    standardItems: [
      "Lineamientos de la OMS para la donación de medicamentos.",
      "Catálogo de materiales de emergencia con código y especificaciones.",
      "Catálogo de artículos de emergencia (Emergency Relief Items).",
      "Taxonomía internacional de categorías de producto, en español.",
      "Códigos de barras (GTIN) para validar y autocompletar productos.",
    ],
    ctaH2: "¿Coordinas un centro de acopio?",
    ctaP: "Suma tu centro al estándar común y prepara envíos que lleguen ordenados, cumpliendo el régimen humanitario.",
    ctaPrimary: "Empezar ahora",
    ctaSecondary: "Ver el estándar completo",
    howToName: "Cómo funciona Araguaney, del acopio al envío",
    crumbHome: "Inicio",
    crumbSelf: "Cómo funciona",
  },
  en: {
    metaTitle: "How Araguaney works",
    ogTitle: "How Araguaney works — Araguaney",
    description:
      "How does Araguaney work, from collection to shipping? Register donations item by item, pack them into homogeneous boxes with QR codes, consolidate them into pallets and shipments with a manifest, and see national stock in real time.",
    ogEyebrow: "How it works",
    heroEyebrow: "How it works",
    h1: "That every donation arrives in order",
    heroP:
      "Araguaney gives collection centers a single standard to receive in-kind donations, pack them with quality control, and prepare them for shipping — with traceability from box to shipment and a dashboard that adds up the stock of every center.",
    heroPills: ["Free for collection centers", "For any emergency", "No personal data"],
    flow: {
      eyebrow: "The flow",
      h2: "From collection to shipping, in five steps",
      note: "Every donation follows the same path. Order is what keeps the cargo from getting stuck: nothing moves forward until the previous piece is ready.",
    },
    stages: [
      { title: "Intake", desc: "The donation is registered item by item: product, quantity, batch, expiry." },
      { title: "Box", desc: "One product, one batch, one expiry. Sealed with a QR code and label." },
      { title: "Pallet", desc: "Groups sealed boxes. It can be mixed. It also has its own QR code." },
      { title: "Shipment", desc: "Groups closed pallets. Once dispatched, everything is frozen." },
      { title: "Manifest", desc: "An exportable packing list, box by box, ready for customs." },
    ],
    concepts: {
      eyebrow: "The pieces",
      h2: "A shared vocabulary for every center",
      note: "The reason the stock of dozens of centers can be added up is that they all speak the same language.",
    },
    conceptItems: [
      { h: "Homogeneous box", p: "One product, one batch and one expiry per box. That's what lets you verify the contents without opening it — the key requirement of humanitarian shipping." },
      { h: "Pallet", p: "Groups sealed boxes for transport. It can carry different products. It has its own QR code for tracking." },
      { h: "Shipment", p: "Groups pallets and generates the manifest. Once dispatched, it freezes its contents to preserve traceability." },
      { h: "National dashboard", p: "Adds up the available stock of every connected center: what there is, how much, and where, in real time." },
    ],
    traceability: {
      eyebrow: "Traceability",
      h2: "Every piece leaves a trail",
      note: "Boxes, pallets and shipments move through states in a single direction, and every change is recorded. That way you always know where each thing is.",
    },
    tracks: [
      { name: "Box", steps: ["Registered", "Sealed", "Shipped"] },
      { name: "Pallet", steps: ["Open", "Closed", "Shipped"] },
      { name: "Shipment", steps: ["Open", "Closed", "Dispatched"] },
    ],
    rules: {
      eyebrow: "Quality control",
      h2: "Rules the system enforces on its own",
      note: "Araguaney validates every donation as it's registered, so that what shouldn't be prepared or shipped never is.",
    },
    ruleItems: [
      { h: "Homogeneous box", p: "A box carries a single product, batch and expiry. If a mix arrives, it's split into several boxes." },
      { h: "Minimum shelf life", p: "Medicine: at least 365 days remaining (WHO guidelines). Food and water: at least 180 days. Below that, the donation is rejected." },
      { h: "Identified medicine", p: "An INN name, form, strength and batch are required. Without them, it can't be sealed." },
      { h: "Controlled items blocked", p: "Controlled products are rejected at intake, without exception." },
    ],
    standards: {
      eyebrow: "Backing",
      h2: "Standards we're backed by",
      note: "We didn't invent quality and traceability: they rest on open, recognized standards.",
    },
    standardItems: [
      "WHO guidelines for medicine donation.",
      "Emergency material catalogue with codes and specifications.",
      "Emergency Relief Items catalogue.",
      "International product category taxonomy.",
      "Barcodes (GTIN) to validate and autocomplete products.",
    ],
    ctaH2: "Do you coordinate a collection center?",
    ctaP: "Add your center to the common standard and prepare shipments that arrive in order, meeting the humanitarian regime.",
    ctaPrimary: "Start now",
    ctaSecondary: "See the full standard",
    howToName: "How Araguaney works, from collection to shipping",
    crumbHome: "Home",
    crumbSelf: "How it works",
  },
}

const eyebrowStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 9, fontSize: 12, fontWeight: 700,
  letterSpacing: "0.14em", textTransform: "uppercase", color: "#946A00",
}
const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.15,
  letterSpacing: "-0.01em", margin: "8px 0 0", color: "#2B2723",
}
const sectNote: React.CSSProperties = { color: "#5C5347", fontSize: 15, margin: "8px 0 0", maxWidth: "60ch", lineHeight: 1.55 }

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span style={eyebrowStyle}>
      <span style={{ width: 22, height: 2, background: "#906400", borderRadius: 2, display: "inline-block" }} />
      {children}
    </span>
  )
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

export default async function ComoFuncionaPage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang: locale } = await params
  const dict = await getDictionary(locale)
  const c = CONTENT[locale]

  const stages = c.stages.map((s, i) => ({ ...s, d: STAGE_D[i] }))
  const rules = c.ruleItems.map((r, i) => ({ ...r, n: RULE_N[i] }))
  const standards = c.standardItems.map((p, i) => ({ p, a: STANDARD_A[i] }))

  const crumbs = [
    { name: c.crumbHome, path: localizedPath("", locale) },
    { name: c.crumbSelf, path: localizedPath(KEY, locale) },
  ]
  const structuredData: Schema[] = [
    howToSchema({
      name: c.howToName,
      description: c.description,
      path: localizedPath(KEY, locale),
      steps: c.stages.map((s) => ({ name: s.title, text: s.desc })),
      locale,
    }),
    breadcrumbSchema(crumbs),
  ]

  const collectionCenterHref =
    locale === "es" ? "/centro-de-acopio" : localizedPath("centro-de-acopio", "en")

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
          <div className="max-w-[860px] mx-auto">

            {/* ── Hero ── */}
            <Eyebrow>{c.heroEyebrow}</Eyebrow>
            <h1
              className="text-[30px] md:text-[46px] mt-4 mb-4"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.01em", textWrap: "balance" }}
            >
              {c.h1}
            </h1>
            <p className="text-[16px] md:text-[19px]" style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: "62ch" }}>
              {c.heroP}
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              {c.heroPills.map((t) => (
                <span key={t} className="text-[12.5px]" style={{ fontWeight: 600, color: "#6E6557", background: "#fff", border: "1px solid #EEE6D4", borderRadius: 999, padding: "5px 13px" }}>
                  {t}
                </span>
              ))}
            </div>

            {/* ── Pipeline ── */}
            <section className="mt-14 md:mt-[72px]">
              <Eyebrow>{c.flow.eyebrow}</Eyebrow>
              <h2 className="text-[22px] md:text-[30px]" style={h2Style}>{c.flow.h2}</h2>
              <p style={sectNote}>{c.flow.note}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 mt-6 p-4 md:p-6" style={{ background: "#fff", border: "1px solid #EEE6D4", borderRadius: 18 }}>
                {stages.map((s, i) => (
                  <div key={s.title} className="flex md:block items-center gap-3 p-2.5 md:text-center">
                    <div className="md:mx-auto md:mb-3" style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", background: "#F6EFDF", border: "1px solid #EEE6D4", color: "#1F5E8C", flex: "none" }}>
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        {s.d.split(" M").map((seg, si) => <path key={si} d={si === 0 ? seg : `M${seg}`} />)}
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[14px]" style={{ fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 3px" }}>{i + 1} · {s.title}</h3>
                      <span className="text-[12px]" style={{ color: "#8A8073", lineHeight: 1.4 }}>{s.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Conceptos ── */}
            <section className="mt-14 md:mt-[72px]">
              <Eyebrow>{c.concepts.eyebrow}</Eyebrow>
              <h2 className="text-[22px] md:text-[30px]" style={h2Style}>{c.concepts.h2}</h2>
              <p style={sectNote}>{c.concepts.note}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {c.conceptItems.map((item) => (
                  <div key={item.h} className="p-[18px]" style={{ background: "#fff", border: "1px solid #EEE6D4", borderRadius: 14 }}>
                    <h3 className="text-[15px]" style={{ fontWeight: 700, margin: "0 0 5px" }}>{item.h}</h3>
                    <p className="text-[13.5px]" style={{ color: "#6E6557", lineHeight: 1.55, margin: 0 }}>{item.p}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Trazabilidad ── */}
            <section className="mt-14 md:mt-[72px]">
              <Eyebrow>{c.traceability.eyebrow}</Eyebrow>
              <h2 className="text-[22px] md:text-[30px]" style={h2Style}>{c.traceability.h2}</h2>
              <p style={sectNote}>{c.traceability.note}</p>
              <div className="mt-6 p-[18px] md:p-6" style={{ background: "#fff", border: "1px solid #EEE6D4", borderRadius: 16 }}>
                {c.tracks.map((t, ti) => (
                  <div key={t.name} className="grid grid-cols-1 md:grid-cols-[110px_1fr] gap-2 md:gap-4 md:items-center py-3.5" style={{ borderTop: ti === 0 ? "none" : "1px solid #EEE6D4" }}>
                    <span style={{ fontFamily: "var(--font-source-serif)", fontSize: 17, fontWeight: 600 }}>{t.name}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {t.steps.map((st, si) => (
                        <span key={st} className="flex items-center gap-2">
                          <span className="text-[11.5px]" style={{ fontFamily: "monospace", fontWeight: 600, padding: "5px 10px", borderRadius: 7, border: "1px solid " + (si === 2 ? "#B8D8C6" : si === 1 ? "#B7D1E4" : "#D8CBAC"), background: si === 2 ? "#EAF5EF" : si === 1 ? "#EBF3F9" : "#F6EFDF", color: si === 2 ? "#2E7D5B" : si === 1 ? "#1F5E8C" : "#2B2723" }}>{st}</span>
                          {si < t.steps.length - 1 && <span style={{ color: "#8A8073", fontSize: 13 }}>→</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Reglas ── */}
            <section className="mt-14 md:mt-[72px]">
              <Eyebrow>{c.rules.eyebrow}</Eyebrow>
              <h2 className="text-[22px] md:text-[30px]" style={h2Style}>{c.rules.h2}</h2>
              <p style={sectNote}>{c.rules.note}</p>
              <div className="mt-4">
                {rules.map((r, ri) => (
                  <div key={r.n} className="flex gap-3.5 py-[15px]" style={{ borderTop: ri === 0 ? "none" : "1px solid #EEE6D4" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#946A00", flex: "none", paddingTop: 1 }}>{r.n}</span>
                    <div>
                      <h3 className="text-[14.5px]" style={{ fontWeight: 700, margin: "0 0 3px" }}>{r.h}</h3>
                      <p className="text-[13.5px]" style={{ color: "#6E6557", lineHeight: 1.55, margin: 0 }}>{r.p}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Estándares ── */}
            <section className="mt-14 md:mt-[72px]">
              <Eyebrow>{c.standards.eyebrow}</Eyebrow>
              <h2 className="text-[22px] md:text-[30px]" style={h2Style}>{c.standards.h2}</h2>
              <p style={sectNote}>{c.standards.note}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-6">
                {standards.map((s) => (
                  <div key={s.a} className="flex gap-3.5 items-baseline p-[14px]" style={{ background: "#fff", border: "1px solid #EEE6D4", borderRadius: 12 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#1F5E8C", flex: "none", minWidth: 62 }}>{s.a}</span>
                    <p className="text-[13px]" style={{ color: "#6E6557", lineHeight: 1.5, margin: 0 }}>{s.p}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── CTA ── */}
            <div className="mt-14 md:mt-[72px] p-7 md:p-11 text-center" style={{ background: "#fff", border: "1px solid #EEE6D4", borderRadius: 18 }}>
              <h2 className="text-[22px] md:text-[30px] mb-2.5" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, textWrap: "balance", margin: "0 0 10px" }}>
                {c.ctaH2}
              </h2>
              <p className="text-[15px]" style={{ color: "#5C5347", maxWidth: "48ch", margin: "0 auto 20px", lineHeight: 1.55 }}>
                {c.ctaP}
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <CtaLink
                  href="/login"
                  ctaLabel="como_funciona_final"
                  className="inline-flex items-center justify-center px-[26px] py-[13px]"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 700, fontSize: 14.5, borderRadius: 999 }}
                >
                  {c.ctaPrimary}
                </CtaLink>
                <Link
                  href={collectionCenterHref}
                  className="inline-flex items-center justify-center px-[26px] py-[13px]"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 700, fontSize: 14.5, borderRadius: 999 }}
                >
                  {c.ctaSecondary}
                </Link>
              </div>
            </div>

          </div>
        </div>

        <HomeFooter dict={dict.footer} locale={locale} />
      </div>
    </>
  )
}
