import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { definedTermSetSchema, breadcrumbSchema } from "@/lib/structured-data"

const KEY = "glosario"

interface Term {
  term: string
  definition: string
}
interface Content {
  metaTitle: string
  ogTitle: string
  description: string
  ogEyebrow: string
  eyebrow: string
  h1: string
  intro: string
  terms: Term[]
  ctaHeading: string
  ctaGuides: string
  ctaStandard: string
  crumbHome: string
  crumbSelf: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Glosario de ayuda humanitaria y centros de acopio",
    ogTitle: "Glosario de ayuda humanitaria y centros de acopio — Araguaney",
    description:
      "Definiciones claras de los términos clave de la logística humanitaria: centro de acopio, caja homogénea, tarima, manifiesto, INN, UNSPSC, GS1 y más.",
    ogEyebrow: "Glosario",
    eyebrow: "Glosario",
    h1: "Glosario de ayuda humanitaria",
    intro:
      "Los términos clave de la logística de donaciones y centros de acopio, explicados en lenguaje claro. Basados en estándares reconocidos (OMS, IFRC/ICRC, IOM, UNSPSC, GS1).",
    terms: [
      {
        term: "Centro de acopio",
        definition:
          "Punto físico donde se reciben, clasifican y preparan donaciones en especie para canalizarlas hacia zonas afectadas por una emergencia. No entrega ayuda al beneficiario final: prepara y consolida carga.",
      },
      {
        term: "Donación en especie",
        definition:
          "Donación de bienes físicos (medicamentos, alimentos, agua, higiene, herramientas) en vez de dinero. Es el único tipo de donación que gestiona un centro de acopio.",
      },
      {
        term: "Caja homogénea",
        definition:
          "Caja que contiene un solo tipo de producto, un solo lote y una sola fecha de caducidad — sin mezclas. Es el requisito central del régimen de envío humanitario: permite verificar el contenido sin abrir la caja.",
      },
      {
        term: "Tarima (pallet)",
        definition:
          "Plataforma de transporte que agrupa varias cajas selladas. A diferencia de la caja, la tarima sí es mixta: puede llevar distintos productos. Tiene su propio código QR para trazabilidad.",
      },
      {
        term: "Envío (shipment)",
        definition:
          "Conjunto de tarimas que sale hacia el destino. Al cerrarse genera el manifiesto y, una vez marcado como enviado, congela todo su contenido para mantener la trazabilidad.",
      },
      {
        term: "Manifiesto / packing list",
        definition:
          "Documento que lista, caja por caja, el contenido de un envío: código de material, descripción, cantidad, unidad y peso. Es lo que la aduana usa para verificar la carga sin inspección física completa.",
      },
      {
        term: "Intake (recepción)",
        definition:
          "Registro de una donación entrante en el centro de acopio. Se captura por ítem (categoría, lote, caducidad) y aplica las reglas de rechazo. No registra datos personales del donante.",
      },
      {
        term: "Caja homogénea vs. bulto",
        definition:
          'Un bulto es una caja o bolsa genérica contada por volumen ("3 cajas de medicamentos"). Una caja homogénea se cuenta por ítem con lote y caducidad. La diferencia es lo que permite saber qué hay disponible, no solo cuánto.',
      },
      {
        term: "INN (Denominación Común Internacional)",
        definition:
          'Nombre genérico oficial de un principio activo farmacéutico, definido por la OMS (por ejemplo, "ibuprofeno"). Es obligatorio para sellar una caja de medicamentos, porque identifica el fármaco sin depender de marcas comerciales.',
      },
      {
        term: "Lote (batch)",
        definition:
          "Identificador de producción de un producto, impreso por el fabricante. Junto con la caducidad, define la trazabilidad de una caja homogénea y es obligatorio en medicamentos.",
      },
      {
        term: "Vida útil restante",
        definition:
          "Días entre la fecha de captura y la caducidad del producto. Los medicamentos requieren al menos 365 días (lineamientos de la OMS) y los alimentos al menos 180 días; por debajo de eso, la donación se rechaza.",
      },
      {
        term: "UNSPSC",
        definition:
          "United Nations Standard Products and Services Code — taxonomía internacional para clasificar productos y servicios, disponible en español. Araguaney la usa para categorizar donaciones de forma estandarizada.",
      },
      {
        term: "GS1 / GTIN",
        definition:
          "GS1 es la organización que administra los códigos de barras globales; el GTIN es el número que identifica un producto comercial. Araguaney lo usa opcionalmente para validar y autocompletar productos por código de barras.",
      },
      {
        term: "IFRC/ICRC e IOM",
        definition:
          "Federación Internacional de la Cruz Roja (IFRC/ICRC) y Organización Internacional para las Migraciones (IOM): sus catálogos de materiales de emergencia definen especificaciones y códigos de material para artículos no alimentarios.",
      },
      {
        term: "Régimen de envío humanitario",
        definition:
          "Conjunto de requisitos para que una carga humanitaria pase por aduana sin atorarse: cajas homogéneas más un manifiesto detallado. Sin ese orden, los envíos se detienen en el trámite aduanal.",
      },
      {
        term: "Panel agregado nacional",
        definition:
          "Vista que suma el stock disponible de todos los centros de acopio de una coordinación, por categoría, producto y centro. Es lo que permite ver, a nivel nacional, qué hay y qué falta en tiempo real.",
      },
    ],
    ctaHeading: "¿Empezando un centro de acopio? Estas guías te ayudan",
    ctaGuides: "Ver las guías",
    ctaStandard: "Conoce el estándar",
    crumbHome: "Inicio",
    crumbSelf: "Glosario",
  },
  en: {
    metaTitle: "Humanitarian aid and collection center glossary",
    ogTitle: "Humanitarian aid and collection center glossary — Araguaney",
    description:
      "Clear definitions of the key terms of humanitarian logistics: collection center, homogeneous box, pallet, manifest, INN, UNSPSC, GS1 and more.",
    ogEyebrow: "Glossary",
    eyebrow: "Glossary",
    h1: "Humanitarian aid glossary",
    intro:
      "The key terms of donation logistics and collection centers, explained in plain language. Based on recognized standards (WHO, IFRC/ICRC, IOM, UNSPSC, GS1).",
    terms: [
      {
        term: "Collection center",
        definition:
          "Physical point where in-kind donations are received, sorted and prepared to channel toward areas hit by an emergency. It doesn't hand aid to the final beneficiary: it prepares and consolidates cargo.",
      },
      {
        term: "In-kind donation",
        definition:
          "Donation of physical goods (medicine, food, water, hygiene, tools) instead of money. It's the only type of donation a collection center manages.",
      },
      {
        term: "Homogeneous box",
        definition:
          "A box that contains a single product type, a single batch and a single expiry date — with no mixing. It's the core requirement of the humanitarian shipping regime: it lets you verify the contents without opening the box.",
      },
      {
        term: "Pallet",
        definition:
          "Transport platform that groups several sealed boxes. Unlike a box, a pallet can be mixed: it may carry different products. It has its own QR code for traceability.",
      },
      {
        term: "Shipment",
        definition:
          "Set of pallets that departs toward the destination. When closed it generates the manifest and, once marked as shipped, it freezes all its contents to preserve traceability.",
      },
      {
        term: "Manifest / packing list",
        definition:
          "Document that lists, box by box, the contents of a shipment: material code, description, quantity, unit and weight. It's what customs uses to verify the cargo without a full physical inspection.",
      },
      {
        term: "Intake",
        definition:
          "Registration of an incoming donation at the collection center. It's captured item by item (category, batch, expiry) and applies the rejection rules. It does not record the donor's personal data.",
      },
      {
        term: "Homogeneous box vs. loose package",
        definition:
          'A loose package is a generic box or bag counted by volume ("3 boxes of medicine"). A homogeneous box is counted item by item, with batch and expiry. That difference is what lets you know what is available, not just how much.',
      },
      {
        term: "INN (International Nonproprietary Name)",
        definition:
          'Official generic name of a pharmaceutical active ingredient, defined by the WHO (for example, "ibuprofen"). It is required to seal a box of medicine, because it identifies the drug without relying on commercial brands.',
      },
      {
        term: "Batch",
        definition:
          "Production identifier of a product, printed by the manufacturer. Together with the expiry date, it defines the traceability of a homogeneous box and is mandatory for medicine.",
      },
      {
        term: "Remaining shelf life",
        definition:
          "Days between the capture date and the product's expiry. Medicine requires at least 365 days (WHO guidelines) and food at least 180 days; below that, the donation is rejected.",
      },
      {
        term: "UNSPSC",
        definition:
          "United Nations Standard Products and Services Code — an international taxonomy to classify products and services, available in Spanish. Araguaney uses it to categorize donations in a standardized way.",
      },
      {
        term: "GS1 / GTIN",
        definition:
          "GS1 is the organization that manages global barcodes; the GTIN is the number that identifies a commercial product. Araguaney uses it optionally to validate and autocomplete products by barcode.",
      },
      {
        term: "IFRC/ICRC and IOM",
        definition:
          "International Federation of the Red Cross (IFRC/ICRC) and International Organization for Migration (IOM): their emergency material catalogues define specifications and material codes for non-food items.",
      },
      {
        term: "Humanitarian shipping regime",
        definition:
          "Set of requirements for humanitarian cargo to clear customs without getting stuck: homogeneous boxes plus a detailed manifest. Without that order, shipments stall in customs processing.",
      },
      {
        term: "National aggregate dashboard",
        definition:
          "View that adds up the available stock of every collection center in a coordination, by category, product and center. It's what lets you see, at the national level, what there is and what's missing in real time.",
      },
    ],
    ctaHeading: "Starting a collection center? These guides help",
    ctaGuides: "See the guides",
    ctaStandard: "Explore the standard",
    crumbHome: "Home",
    crumbSelf: "Glossary",
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

export default async function GlosarioPage({
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
    definedTermSetSchema(c.metaTitle, localizedPath(KEY, locale), c.terms),
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

        <div className="px-5 md:px-[46px] pt-[26px] md:pt-[56px] pb-16 md:pb-20 flex-1">
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
              className="text-[28px] md:text-[38px] mb-4"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.15, margin: "0 0 16px" }}
            >
              {c.h1}
            </h1>

            <p className="text-[15px] md:text-[17px] mb-9" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.intro}
            </p>

            <dl className="space-y-6">
              {c.terms.map((entry) => (
                <div key={entry.term}>
                  <dt
                    className="text-[16px] md:text-[18px] mb-1"
                    style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723" }}
                  >
                    {entry.term}
                  </dt>
                  <dd className="text-[14px] md:text-[15px]" style={{ color: "#5C5347", lineHeight: 1.6, margin: 0 }}>
                    {entry.definition}
                  </dd>
                </div>
              ))}
            </dl>

            <div
              className="mt-12 p-6 md:p-8 text-center"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
                {c.ctaHeading}
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <Link
                  href={localizedPath("guias", locale)}
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  {c.ctaGuides}
                </Link>
                <Link
                  href={localizedPath("centro-de-acopio", locale)}
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  {c.ctaStandard}
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
