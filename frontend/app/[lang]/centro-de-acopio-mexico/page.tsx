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
import { breadcrumbSchema } from "@/lib/structured-data"

const KEY = "centro-de-acopio-mexico"

interface Content {
  metaTitle: string
  ogTitle: string
  description: string
  ogEyebrow: string
  eyebrow: string
  h1: string
  heroP: string
  cofeprisH2: string
  cofeprisP: string
  aduanaH2: string
  aduanaP: string
  aduanaNote: string
  aduanaGuideLink: string
  howH2: string
  howP: string
  finalH2: string
  finalCta: string
  crossPillarLink: string
  crossNeedsLink: string
  crumbHome: string
  crumbSelf: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Centro de acopio en México",
    ogTitle: "Centro de acopio en México — Araguaney",
    description:
      "¿Cómo montar un centro de acopio en México? Araguaney estandariza el registro de donaciones (identificación tipo COFEPRIS), las cajas con QR y el manifiesto para aduana (SAT). Gratis.",
    ogEyebrow: "México",
    eyebrow: "México",
    h1: "Centro de acopio en México",
    heroP:
      "En México, los centros de acopio se multiplican tras cada emergencia — en la CDMX, Monterrey, Guadalajara y decenas de ciudades más. Araguaney les da un estándar común para registrar donaciones en especie, empacarlas bien y preparar envíos que cumplan las reglas, sin importar desde qué ciudad operen.",
    cofeprisH2: "Identificación de medicamentos (COFEPRIS)",
    cofeprisP:
      "En México, los medicamentos se identifican y regulan a través de COFEPRIS. Para que una donación de medicamentos pueda usarse y enviarse, necesita estar bien identificada: denominación (INN), lote y caducidad legibles, y una vida útil restante suficiente. Araguaney captura esos datos en el registro por ítem y aplica las reglas de la OMS (vida útil mínima, bloqueo de controlados) en el momento de la recepción — de modo que lo que se sella ya viene identificado y en regla.",
    aduanaH2: "Aduana e importación humanitaria (SAT)",
    aduanaP:
      "Cuando la ayuda cruza frontera, la autoridad aduanera (SAT) necesita verificar rápido qué contiene cada bulto. Un envío mal documentado se atora. Araguaney genera el manifiesto / packing list automáticamente a partir de las cajas homogéneas y tarimas de cada envío, con clasificación reconocida (IFRC/ICRC, UNSPSC) — lo que la aduana necesita para verificar el contenido sin abrir cada caja.",
    aduanaNote:
      "Esta página es orientativa y no constituye asesoría legal ni aduanera. Consulta siempre la normativa vigente y a la autoridad correspondiente para tu caso.",
    aduanaGuideLink: "Guía completa: cómo preparar carga humanitaria para aduana →",
    howH2: "Cómo ayuda Araguaney",
    howP:
      "Registro por ítem con reglas de calidad, cajas homogéneas con QR y etiqueta, tarimas y envíos con manifiesto exportable, y un panel nacional que suma el stock de todos los centros conectados. El mismo estándar, opere tu centro donde opere.",
    finalH2: "Suma tu centro de acopio en México",
    finalCta: "Sumar mi centro de acopio",
    crossPillarLink: "Qué es un centro de acopio y qué software necesita →",
    crossNeedsLink: "Ver qué falta ahora en los centros →",
    crumbHome: "Inicio",
    crumbSelf: "Centro de acopio en México",
  },
  en: {
    metaTitle: "Aid collection center in Mexico",
    ogTitle: "Aid collection center in Mexico — Araguaney",
    description:
      "How to set up a collection center in Mexico? Araguaney standardizes donation intake (COFEPRIS-style identification), boxes with QR codes and the customs manifest (SAT). Free.",
    ogEyebrow: "Mexico",
    eyebrow: "Mexico",
    h1: "Aid collection center in Mexico",
    heroP:
      "In Mexico, collection centers multiply after every emergency — in Mexico City, Monterrey, Guadalajara and dozens more. Araguaney gives them a common standard to register in-kind donations, pack them well, and prepare shipments that meet the rules, no matter which city they operate from.",
    cofeprisH2: "Medicine identification (COFEPRIS)",
    cofeprisP:
      "In Mexico, medicines are identified and regulated through COFEPRIS. For a medicine donation to be usable and shippable, it needs proper identification: legible name (INN), batch and expiry, and enough remaining shelf life. Araguaney captures that at item-level intake and applies WHO rules (minimum shelf life, blocking of controlled substances) at the moment of receipt — so what's sealed is already identified and compliant.",
    aduanaH2: "Customs and humanitarian imports (SAT)",
    aduanaP:
      "When aid crosses a border, the customs authority (SAT) needs to quickly verify what each package contains. A poorly documented shipment gets stuck. Araguaney generates the manifest / packing list automatically from each shipment's homogeneous boxes and pallets, with recognized classification (IFRC/ICRC, UNSPSC) — what customs needs to verify contents without opening every box.",
    aduanaNote:
      "This page is informational and is not legal or customs advice. Always consult current regulations and the relevant authority for your case.",
    aduanaGuideLink: "Full guide: how to prepare humanitarian cargo for customs →",
    howH2: "How Araguaney helps",
    howP:
      "Item-level intake with quality rules, homogeneous boxes with QR codes and labels, pallets and shipments with an exportable manifest, and a national dashboard that adds up the stock of every connected center. The same standard, wherever your center operates.",
    finalH2: "Add your collection center in Mexico",
    finalCta: "Add my collection center",
    crossPillarLink: "What is a collection center and what software does it need? →",
    crossNeedsLink: "See what's needed now across centers →",
    crumbHome: "Home",
    crumbSelf: "Collection center in Mexico",
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

export default async function MexicoPage({
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
  const structuredData = [breadcrumbSchema(crumbs)]

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
        <div className="px-5 md:px-[46px] pt-[26px] md:pt-[64px] pb-10 md:pb-[48px]">
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

        {/* ── COFEPRIS ── */}
        <div className="px-5 md:px-[46px] py-10 md:py-[52px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[22px] md:text-[28px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
              {c.cofeprisH2}
            </h2>
            <p className="text-[14.5px] md:text-[16px]" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.cofeprisP}
            </p>
          </div>
        </div>

        {/* ── Aduana / SAT ── */}
        <div className="px-5 md:px-[46px] py-10 md:py-[52px]" style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[22px] md:text-[28px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
              {c.aduanaH2}
            </h2>
            <p className="text-[14.5px] md:text-[16px] mb-4" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.aduanaP}
            </p>
            <p className="text-[13px] mb-4" style={{ color: "#8A8073", lineHeight: 1.6, fontStyle: "italic" }}>
              {c.aduanaNote}
            </p>
            <Link href={localizedPath("guias/como-preparar-carga-humanitaria-para-aduana", locale)} style={{ color: "#1F5E8C", fontWeight: 600, fontSize: 14.5 }}>
              {c.aduanaGuideLink}
            </Link>
          </div>
        </div>

        {/* ── How Araguaney helps ── */}
        <div className="px-5 md:px-[46px] py-10 md:py-[52px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[22px] md:text-[28px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
              {c.howH2}
            </h2>
            <p className="text-[14.5px] md:text-[16px]" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.howP}
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
            ctaLabel="mexico_final"
            className="inline-flex items-center justify-center px-[26px] py-[14px] mb-4"
            style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 15, borderRadius: 99, boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)" }}
          >
            {c.finalCta}
          </CtaLink>
          <p className="text-[13.5px] mb-2" style={{ color: "#6E6557" }}>
            <Link href={localizedPath("centro-de-acopio", locale)} style={{ color: "#1F5E8C", fontWeight: 600 }}>
              {c.crossPillarLink}
            </Link>
          </p>
          <p className="text-[13.5px]" style={{ color: "#6E6557" }}>
            <Link href={localizedPath("necesidades", locale)} style={{ color: "#1F5E8C", fontWeight: 600 }}>
              {c.crossNeedsLink}
            </Link>
          </p>
        </div>

        <HomeFooter dict={dict.footer} locale={locale} />
      </div>
    </>
  )
}
