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
import { ORGANIZATION_SCHEMA, aboutPageSchema, breadcrumbSchema } from "@/lib/structured-data"

const KEY = "nosotros"

interface Step {
  icon: string
  title: string
  desc: string
}
interface Standard {
  name: string
  desc: string
}
interface Content {
  metaTitle: string
  ogTitle: string
  description: string
  ogEyebrow: string
  eyebrow: string
  h1: string
  heroP: string
  whyH2: string
  whyP: string
  howH2: string
  steps: Step[]
  standardsH2: string
  standardsP: string
  standards: Standard[]
  privacyH2: string
  privacyP: string
  founderH2: string
  founderP: string
  finalH2: string
  finalCta: string
  crossFuncText: string
  crossFuncLink: string
  crossPillarLink: string
  crumbHome: string
  crumbSelf: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Nosotros",
    ogTitle: "Nosotros — Araguaney",
    description:
      "Araguaney es el estándar común para coordinar centros de acopio y logística de ayuda humanitaria: registro por ítem, cajas con QR, manifiestos y panel nacional. Sin datos personales.",
    ogEyebrow: "Nosotros",
    eyebrow: "Nosotros",
    h1: "El estándar común para la logística de ayuda humanitaria en especie",
    heroP:
      "Araguaney nació para resolver un problema concreto: cuando ocurre una emergencia, decenas de centros de acopio operan por separado, cada uno con su método, y nadie puede ver el panorama nacional ni preparar envíos que cumplan las reglas. Somos el estándar que los conecta.",
    whyH2: "Por qué existe Araguaney",
    whyP:
      "Tras un desastre, la ayuda en especie se junta más rápido de lo que se puede ordenar. Sin un estándar común, cada centro registra a su manera, las cajas se arman sin criterio y los envíos se atoran en aduana por falta de manifiesto. El resultado: suministros que no llegan a tiempo. Araguaney pone a todos los centros a hablar el mismo idioma para que la ayuda fluya.",
    howH2: "Cómo lo hacemos",
    steps: [
      { icon: "📝", title: "Registro por ítem", desc: "Cada donación se captura con categoría, lote y caducidad, con reglas de calidad que rechazan lo que no cumple." },
      { icon: "📦", title: "Caja homogénea con QR", desc: "Un solo producto, lote y caducidad por caja. QR y etiqueta impresos al sellar — trazable de punta a punta." },
      { icon: "📋", title: "Tarima y envío con manifiesto", desc: "Las cajas se consolidan en tarimas y envíos con packing list exportable, listo para aduana." },
      { icon: "🗺️", title: "Panel nacional agregado", desc: "El stock de todos los centros conectados, sumado en tiempo real: qué hay, cuánto y dónde." },
    ],
    standardsH2: "Estándares que respaldamos",
    standardsP:
      "No inventamos criterios: nos apoyamos en estándares abiertos y reconocidos internacionalmente, para que el inventario sea confiable y trazable.",
    standards: [
      { name: "WHO", desc: "Lineamientos para la donación de medicamentos (vida útil, INN, controlados)." },
      { name: "IFRC / ICRC", desc: "Catálogo de materiales y especificaciones de artículos de no-alimentos." },
      { name: "IOM", desc: "Emergency Relief Items Catalogue para equipo de emergencia." },
      { name: "UNSPSC", desc: "Taxonomía estándar de categorías de productos." },
      { name: "GS1", desc: "Códigos de barras / GTIN para validar productos." },
    ],
    privacyH2: "Privacidad por diseño",
    privacyP:
      "Araguaney no registra datos personales de donantes ni de beneficiarios. Solo gestiona inventario, trazable de la caja al envío. Menos superficie de datos sensibles, menos riesgo, y una herramienta que se concentra en lo que importa: que la ayuda llegue.",
    founderH2: "Quién está detrás",
    founderP:
      "Araguaney fue fundado en 2026 por Antony E Delgado Casanova, con la misión de dar a la coordinación humanitaria en especie un estándar común, abierto y gratuito.",
    finalH2: "Suma tu centro al estándar nacional",
    finalCta: "Sumar mi centro de acopio",
    crossFuncText: "¿Quieres ver el flujo completo? ",
    crossFuncLink: "Cómo funciona Araguaney →",
    crossPillarLink: "Software para centro de acopio →",
    crumbHome: "Inicio",
    crumbSelf: "Nosotros",
  },
  en: {
    metaTitle: "About",
    ogTitle: "About — Araguaney",
    description:
      "Araguaney is the common standard for coordinating aid collection centers and humanitarian logistics: item-level intake, boxes with QR codes, manifests and a national dashboard. No personal data.",
    ogEyebrow: "About",
    eyebrow: "About",
    h1: "The common standard for in-kind humanitarian aid logistics",
    heroP:
      "Araguaney was born to solve a concrete problem: when an emergency hits, dozens of collection centers work separately, each their own way, and no one can see the national picture or prepare shipments that meet the rules. We're the standard that connects them.",
    whyH2: "Why Araguaney exists",
    whyP:
      "After a disaster, in-kind aid piles up faster than it can be organized. Without a common standard, every center records its own way, boxes are packed without criteria, and shipments get stuck at customs for lack of a manifest. The result: supplies that don't arrive in time. Araguaney gets every center speaking the same language so aid can flow.",
    howH2: "How we do it",
    steps: [
      { icon: "📝", title: "Item-level intake", desc: "Every donation is captured with category, batch and expiry, with quality rules that reject what doesn't comply." },
      { icon: "📦", title: "Homogeneous box with QR", desc: "One product, batch and expiry per box. QR and label printed on sealing — traceable end to end." },
      { icon: "📋", title: "Pallet and shipment with manifest", desc: "Boxes consolidate into pallets and shipments with an exportable packing list, customs-ready." },
      { icon: "🗺️", title: "National dashboard", desc: "The stock of every connected center, added up in real time: what there is, how much, and where." },
    ],
    standardsH2: "Standards we back",
    standardsP:
      "We don't invent criteria: we rely on open, internationally recognized standards so inventory is reliable and traceable.",
    standards: [
      { name: "WHO", desc: "Guidelines for medicine donations (shelf life, INN, controlled substances)." },
      { name: "IFRC / ICRC", desc: "Materials catalogue and specifications for non-food items." },
      { name: "IOM", desc: "Emergency Relief Items Catalogue for emergency equipment." },
      { name: "UNSPSC", desc: "Standard taxonomy of product categories." },
      { name: "GS1", desc: "Barcodes / GTIN to validate products." },
    ],
    privacyH2: "Privacy by design",
    privacyP:
      "Araguaney stores no personal data of donors or beneficiaries. It only manages inventory, traceable from box to shipment. Less sensitive-data surface, less risk, and a tool focused on what matters: getting aid delivered.",
    founderH2: "Who's behind it",
    founderP:
      "Araguaney was founded in 2026 by Antony E Delgado Casanova, with the mission of giving in-kind humanitarian coordination a common, open and free standard.",
    finalH2: "Add your center to the national standard",
    finalCta: "Add my collection center",
    crossFuncText: "Want to see the full flow? ",
    crossFuncLink: "How Araguaney works →",
    crossPillarLink: "Collection center software →",
    crumbHome: "Home",
    crumbSelf: "About",
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

export default async function AboutPage({
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
  const structuredData = [
    ORGANIZATION_SCHEMA,
    aboutPageSchema({ path: localizedPath(KEY, locale), locale }),
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
            <p className="text-[14.5px] md:text-[17px]" style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: 600 }}>
              {c.heroP}
            </p>
          </div>
        </div>

        {/* ── Why ── */}
        <div className="px-5 md:px-[46px] py-10 md:py-[56px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[22px] md:text-[30px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
              {c.whyH2}
            </h2>
            <p className="text-[14.5px] md:text-[16px]" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.whyP}
            </p>
          </div>
        </div>

        {/* ── How ── */}
        <div className="px-5 md:px-[46px] py-12 md:py-[64px]" style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[880px] mx-auto">
            <h2 className="text-[22px] md:text-[30px] mb-8 md:mb-10" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 32px" }}>
              {c.howH2}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {c.steps.map((item) => (
                <div key={item.title} className="flex gap-4 items-start p-5" style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}>
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

        {/* ── Standards ── */}
        <div className="px-5 md:px-[46px] py-12 md:py-[56px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[22px] md:text-[30px] mb-3" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 12px" }}>
              {c.standardsH2}
            </h2>
            <p className="text-[14px] md:text-[15px] mb-6" style={{ color: "#6E6557", lineHeight: 1.55, maxWidth: 560 }}>
              {c.standardsP}
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {c.standards.map((s) => (
                <li key={s.name} className="py-3" style={{ borderTop: "1px solid #F1EAD9", display: "flex", gap: 14 }}>
                  <span style={{ flex: "0 0 96px", fontWeight: 700, color: "#2B2723", fontSize: 14 }}>{s.name}</span>
                  <span style={{ color: "#6E6557", fontSize: 14, lineHeight: 1.5 }}>{s.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Privacy ── */}
        <div className="px-5 md:px-[46px] py-10 md:py-[56px]" style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[22px] md:text-[30px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
              {c.privacyH2}
            </h2>
            <p className="text-[14.5px] md:text-[16px]" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.privacyP}
            </p>
          </div>
        </div>

        {/* ── Founder ── */}
        <div className="px-5 md:px-[46px] py-10 md:py-[56px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[18px] md:text-[22px] mb-3" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 12px" }}>
              {c.founderH2}
            </h2>
            <p className="text-[14.5px] md:text-[16px]" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.founderP}
            </p>
          </div>
        </div>

        {/* ── Final CTA + cross-links ── */}
        <div className="px-5 md:px-[46px] py-12 md:py-[64px] text-center" style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}>
          <h2 className="text-[22px] md:text-[28px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
            {c.finalH2}
          </h2>
          <CtaLink
            href={localizedPath("registrar-centro", locale)}
            ctaLabel="nosotros_final"
            className="inline-flex items-center justify-center px-[26px] py-[14px] mb-4"
            style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 15, borderRadius: 99, boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)" }}
          >
            {c.finalCta}
          </CtaLink>
          <p className="text-[13.5px] mb-2" style={{ color: "#6E6557" }}>
            {c.crossFuncText}
            <Link href={localizedPath("como-funciona", locale)} style={{ color: "#1F5E8C", fontWeight: 600 }}>
              {c.crossFuncLink}
            </Link>
          </p>
          <p className="text-[13.5px]" style={{ color: "#6E6557" }}>
            <Link href={localizedPath("centro-de-acopio", locale)} style={{ color: "#1F5E8C", fontWeight: 600 }}>
              {c.crossPillarLink}
            </Link>
          </p>
        </div>

        <HomeFooter dict={dict.footer} locale={locale} />
      </div>
    </>
  )
}
