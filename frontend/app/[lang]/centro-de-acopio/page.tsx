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

const KEY = "centro-de-acopio"

interface Differ {
  icon: string
  title: string
  desc: string
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
  whatH2: string
  whatP: string
  differsH2: string
  differs: Differ[]
  faqTitle: string
  faq: Faq[]
  finalH2: string
  finalCta: string
  crossHumanitarianText: string
  crossHumanitarianLink: string
  crossHumanitarianHref: string
  crossGuideLink: string
  crossGuideHref: string
  crumbHome: string
  crumbSelf: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Software para centro de acopio",
    ogTitle: "Software para centro de acopio — Araguaney",
    description:
      "Gestión de donaciones en especie para tu centro de acopio: registro por ítem, cajas homogéneas con QR, manifiesto exportable y panel nacional en tiempo real.",
    ogEyebrow: "Centro de acopio",
    eyebrow: "Software para centros de acopio",
    h1: "El estándar para registrar, empacar y enviar donaciones de tu centro de acopio",
    heroP:
      "Araguaney registra cada donación en especie por ítem, la empaca en cajas homogéneas con QR, la consolida en tarimas y envíos con manifiesto exportable — el mismo estándar que usan decenas de centros de acopio para coordinarse entre sí.",
    heroCta: "Sumar mi centro de acopio",
    whatH2: "¿Qué es un centro de acopio?",
    whatP:
      "Un centro de acopio recibe donaciones en especie — medicamentos, alimentos, agua, higiene, herramientas — para canalizarlas hacia zonas afectadas por una emergencia. Cuando varios centros operan cada uno con su propio método, es imposible saber qué hay disponible a nivel nacional o preparar un envío que cumpla las reglas de un régimen de ayuda humanitaria: cajas homogéneas y manifiesto detallado. Sin ese orden, los envíos se atoran.",
    differsH2: "Todo lo que necesita un centro de acopio",
    differs: [
      { icon: "📦", title: "Caja homogénea + QR", desc: "Un solo producto, lote y caducidad por caja. QR y etiqueta impresos al sellar — trazable de punta a punta." },
      { icon: "📋", title: "Manifiesto exportable", desc: "Packing list lista para aduana en un clic, generada a partir de las tarimas y cajas de cada envío." },
      { icon: "🗺️", title: "Panel nacional en tiempo real", desc: "Suma el stock de todos los centros de acopio conectados: qué hay, cuánto y dónde." },
      { icon: "💊", title: "Validación de medicamentos", desc: "Vida útil mínima, denominación INN y bloqueo de sustancias controladas según lineamientos de la OMS." },
      { icon: "🔒", title: "Sin datos personales", desc: "No se registra información de donantes ni beneficiarios. Solo inventario, trazable de la caja al envío." },
    ],
    faqTitle: "Preguntas frecuentes",
    faq: [
      { q: "¿Qué es un centro de acopio?", a: "Es un punto físico donde se reciben, clasifican y preparan donaciones en especie para canalizarlas hacia zonas afectadas por una emergencia. No entrega ayuda al beneficiario final: prepara y consolida la carga para su envío." },
      { q: "¿Cuánto cuesta el software de Araguaney?", a: "Es gratuito para centros de acopio y coordinaciones humanitarias: registro por ítem, cajas con QR, manifiestos y panel agregado, sin costo de licencia ni límite de cajas." },
      { q: "¿Qué diferencia a Araguaney de una hoja de cálculo?", a: "Valida reglas de donación (caducidad, controlados), genera QR y manifiestos automáticamente, registra la trazabilidad de cada caja al envío y suma el stock de varios centros en un panel nacional — cosas que una hoja no hace." },
      { q: "¿Se puede usar para cualquier emergencia?", a: "Sí. El estándar es genérico: sismos, inundaciones, incendios o crisis migratorias. No está atado a un evento específico." },
    ],
    finalH2: "Conecta tu centro de acopio con el estándar nacional",
    finalCta: "Sumar mi centro de acopio",
    crossHumanitarianText: "¿Coordinas ayuda para otro tipo de emergencia? ",
    crossHumanitarianLink: "Conoce Araguaney para ayuda humanitaria →",
    crossHumanitarianHref: "/ayuda-humanitaria",
    crossGuideLink: "Guía: cómo organizar un centro de acopio →",
    crossGuideHref: "/guias/como-organizar-un-centro-de-acopio",
    crumbHome: "Inicio",
    crumbSelf: "Centro de acopio",
  },
  en: {
    metaTitle: "Collection center software",
    ogTitle: "Collection center software — Araguaney",
    description:
      "In-kind donation management for your collection center: item-level intake, homogeneous boxes with QR codes, an exportable manifest, and a national dashboard in real time.",
    ogEyebrow: "Collection center",
    eyebrow: "Collection center software",
    h1: "The standard to register, pack and ship your collection center's donations",
    heroP:
      "Araguaney registers every in-kind donation item by item, packs it into homogeneous boxes with QR codes, and consolidates it into pallets and shipments with an exportable manifest — the same standard dozens of collection centers use to coordinate with one another.",
    heroCta: "Add my collection center",
    whatH2: "What is a collection center?",
    whatP:
      "A collection center receives in-kind donations — medicine, food, water, hygiene, tools — to channel them toward areas hit by an emergency. When several centers each work their own way, it's impossible to know what's available nationally or to prepare a shipment that meets the rules of a humanitarian aid regime: homogeneous boxes and a detailed manifest. Without that order, shipments get stuck.",
    differsH2: "Everything a collection center needs",
    differs: [
      { icon: "📦", title: "Homogeneous box + QR", desc: "One product, batch and expiry per box. QR and label printed on sealing — traceable end to end." },
      { icon: "📋", title: "Exportable manifest", desc: "A customs-ready packing list in one click, generated from each shipment's pallets and boxes." },
      { icon: "🗺️", title: "National dashboard in real time", desc: "Adds up the stock of every connected collection center: what there is, how much, and where." },
      { icon: "💊", title: "Medicine validation", desc: "Minimum shelf life, INN name, and blocking of controlled substances per WHO guidelines." },
      { icon: "🔒", title: "No personal data", desc: "No donor or beneficiary information is stored. Only inventory, traceable from box to shipment." },
    ],
    faqTitle: "Frequently asked questions",
    faq: [
      { q: "What is a collection center?", a: "It's a physical point where in-kind donations are received, sorted and prepared to channel toward areas hit by an emergency. It doesn't hand aid to the final beneficiary: it prepares and consolidates the cargo for shipping." },
      { q: "How much does Araguaney's software cost?", a: "It's free for collection centers and humanitarian coordinations: item-level intake, boxes with QR, manifests and an aggregated dashboard, with no license fee and no box limit." },
      { q: "How is Araguaney different from a spreadsheet?", a: "It validates donation rules (expiry, controlled items), generates QR codes and manifests automatically, records the traceability of every box to shipment, and adds up the stock of several centers in a national dashboard — things a spreadsheet doesn't do." },
      { q: "Can it be used for any emergency?", a: "Yes. The standard is generic: earthquakes, floods, fires or migration crises. It isn't tied to a specific event." },
    ],
    finalH2: "Connect your collection center to the national standard",
    finalCta: "Add my collection center",
    crossHumanitarianText: "Coordinating aid for another kind of emergency? ",
    crossHumanitarianLink: "Discover Araguaney for humanitarian aid →",
    crossHumanitarianHref: "/humanitarian-aid",
    crossGuideLink: "Guide: how to organize a collection center →",
    crossGuideHref: "/guias/como-organizar-un-centro-de-acopio",
    crumbHome: "Home",
    crumbSelf: "Collection center",
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

export default async function CollectionCenterPage({
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
              ctaLabel="centro_de_acopio_hero"
              className="inline-flex items-center justify-center px-[26px] py-[14px]"
              style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 15, boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)", borderRadius: 99 }}
            >
              {c.heroCta}
            </CtaLink>
          </div>
        </div>

        {/* ── What is a collection center ── */}
        <div className="px-5 md:px-[46px] py-10 md:py-[56px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[22px] md:text-[30px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
              {c.whatH2}
            </h2>
            <p className="text-[14.5px] md:text-[16px]" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.whatP}
            </p>
          </div>
        </div>

        {/* ── Differentiators ── */}
        <div className="px-5 md:px-[46px] py-12 md:py-[64px]" style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[880px] mx-auto">
            <h2 className="text-[22px] md:text-[30px] mb-8 md:mb-10" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 32px" }}>
              {c.differsH2}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {c.differs.map((item) => (
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
            ctaLabel="centro_de_acopio_final"
            className="inline-flex items-center justify-center px-[26px] py-[14px] mb-4"
            style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 15, borderRadius: 99, boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)" }}
          >
            {c.finalCta}
          </CtaLink>
          <p className="text-[13.5px] mb-2" style={{ color: "#6E6557" }}>
            {c.crossHumanitarianText}
            <Link href={c.crossHumanitarianHref} style={{ color: "#1F5E8C", fontWeight: 600 }}>
              {c.crossHumanitarianLink}
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
