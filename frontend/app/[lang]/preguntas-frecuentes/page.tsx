import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { FaqSection } from "@/components/FaqSection"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { type Locale, type RouteKey, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { faqSchema, breadcrumbSchema } from "@/lib/structured-data"

const KEY = "preguntas-frecuentes"

interface Faq {
  q: string
  a: string
}
interface Group {
  title: string
  faqs: Faq[]
}
interface CrossLink {
  routeKey: RouteKey
  label: string
}
interface Content {
  metaTitle: string
  ogTitle: string
  description: string
  ogEyebrow: string
  eyebrow: string
  h1: string
  heroP: string
  groups: Group[]
  crossH2: string
  crossLinks: CrossLink[]
  crumbHome: string
  crumbSelf: string
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Preguntas frecuentes",
    ogTitle: "Preguntas frecuentes — Araguaney",
    description:
      "Respuestas directas sobre Araguaney: qué es, cuánto cuesta, qué se puede donar, reglas de medicamentos, cómo funciona del acopio al envío y su postura de privacidad.",
    ogEyebrow: "Preguntas frecuentes",
    eyebrow: "Preguntas frecuentes",
    h1: "Preguntas frecuentes",
    heroP:
      "Todo lo esencial sobre Araguaney y la coordinación de centros de acopio, en respuestas directas. ¿Falta algo? Escríbenos.",
    groups: [
      {
        title: "Producto y plataforma",
        faqs: [
          { q: "¿Qué es Araguaney?", a: "Es un software gratuito que estandariza cómo los centros de acopio registran donaciones en especie, las empacan en cajas homogéneas con QR, las consolidan en tarimas y envíos con manifiesto exportable, y ven el stock agregado de todos los centros en tiempo real." },
          { q: "¿Cuánto cuesta Araguaney?", a: "Es gratuito para centros de acopio y coordinaciones humanitarias: registro por ítem, cajas con QR, manifiestos y panel agregado, sin costo de licencia ni límite de cajas." },
          { q: "¿Necesito instalar algo o tener servidores propios?", a: "No. Araguaney es una aplicación web: entras desde el navegador, sin instalar nada ni administrar servidores." },
          { q: "¿Sirve para cualquier tipo de emergencia?", a: "Sí. El estándar es genérico: sismos, inundaciones, incendios o crisis migratorias. No está atado a un evento específico." },
          { q: "¿En qué se diferencia de una hoja de cálculo?", a: "Valida reglas de donación (caducidad, controlados), genera QR y manifiestos automáticamente, registra la trazabilidad de cada caja al envío y suma el stock de varios centros en un panel nacional — cosas que una hoja de cálculo no hace." },
        ],
      },
      {
        title: "Donaciones y reglas",
        faqs: [
          { q: "¿Qué es un centro de acopio?", a: "Un punto físico donde se reciben, clasifican y preparan donaciones en especie para canalizarlas hacia zonas afectadas por una emergencia. No entrega ayuda al beneficiario final: prepara y consolida la carga para su envío." },
          { q: "¿Qué se puede donar?", a: "Medicamentos, insumos médicos, alimentos, agua, higiene, herramientas y equipo de rescate — siempre que cumplan las reglas de calidad (vida útil, sellado, no controlados)." },
          { q: "¿Qué es una caja homogénea y por qué importa?", a: "Una caja con un solo tipo de producto, un solo lote y una sola caducidad. Es lo que hace la carga trazable y aceptable dentro de un envío humanitario formal." },
          { q: "¿Qué reglas aplican a los medicamentos?", a: "Siguen los lineamientos de la OMS: vida útil mínima (≥ 365 días a la fecha de captura), denominación INN, lote y caducidad obligatorios, y bloqueo de sustancias controladas." },
          { q: "¿Qué donaciones se rechazan?", a: "Lo vencido o próximo a vencer, los medicamentos controlados y los productos abiertos o sin sellar. Las reglas se aplican en el momento del registro, no después." },
        ],
      },
      {
        title: "Operación",
        faqs: [
          { q: "¿Cómo funciona, del acopio al envío?", a: "Se registra cada donación por ítem, se empaca en cajas homogéneas con QR, las cajas se consolidan en tarimas, y las tarimas en envíos con un manifiesto exportable listo para aduana." },
          { q: "¿Qué es un manifiesto o packing list?", a: "El documento detallado de todo lo que va en un envío, generado automáticamente a partir de sus tarimas y cajas — lo que exige el régimen de envío humanitario para pasar aduana." },
          { q: "¿Cómo sumo mi centro de acopio?", a: "Desde la página de registro o contacto solicitas sumar tu centro; el equipo revisa la solicitud y te da acceso como coordinador." },
          { q: "¿Puedo coordinar varios centros a la vez?", a: "Sí. El panel nacional agrega el stock de todos los centros conectados, y las transferencias permiten mover inventario entre ellos." },
        ],
      },
      {
        title: "Privacidad y datos",
        faqs: [
          { q: "¿Araguaney guarda datos personales de donantes o beneficiarios?", a: "No. Araguaney solo gestiona inventario, trazable de la caja al envío. No se registran datos personales de donantes ni de beneficiarios." },
          { q: "¿Araguaney gestiona dinero o donativos económicos?", a: "No. Araguaney gestiona únicamente donaciones en especie e inventario; no maneja dinero ni donativos económicos." },
        ],
      },
    ],
    crossH2: "Sigue explorando",
    crossLinks: [
      { routeKey: "centro-de-acopio", label: "Software para centro de acopio" },
      { routeKey: "guias", label: "Guías prácticas" },
      { routeKey: "alternativa-a-excel-para-donaciones", label: "Alternativa a Excel para donaciones" },
      { routeKey: "nosotros", label: "Sobre Araguaney" },
    ],
    crumbHome: "Inicio",
    crumbSelf: "Preguntas frecuentes",
  },
  en: {
    metaTitle: "Frequently asked questions",
    ogTitle: "Frequently asked questions — Araguaney",
    description:
      "Direct answers about Araguaney: what it is, how much it costs, what can be donated, medicine rules, how it works from intake to shipment, and its privacy stance.",
    ogEyebrow: "FAQ",
    eyebrow: "Frequently asked questions",
    h1: "Frequently asked questions",
    heroP:
      "Everything essential about Araguaney and coordinating aid collection centers, in direct answers. Missing something? Get in touch.",
    groups: [
      {
        title: "Product and platform",
        faqs: [
          { q: "What is Araguaney?", a: "A free software that standardizes how collection centers register in-kind donations, pack them into homogeneous boxes with QR codes, consolidate them into pallets and shipments with an exportable manifest, and see the aggregated stock of every center in real time." },
          { q: "How much does Araguaney cost?", a: "It's free for collection centers and humanitarian coordinations: item-level intake, boxes with QR, manifests and an aggregated dashboard, with no license fee and no box limit." },
          { q: "Do I need to install anything or run my own servers?", a: "No. Araguaney is a web application: you use it from the browser, with nothing to install and no servers to manage." },
          { q: "Can it be used for any kind of emergency?", a: "Yes. The standard is generic: earthquakes, floods, fires or migration crises. It isn't tied to a specific event." },
          { q: "How is it different from a spreadsheet?", a: "It validates donation rules (expiry, controlled items), generates QR codes and manifests automatically, records the traceability of every box to shipment, and adds up the stock of several centers in a national dashboard — things a spreadsheet doesn't do." },
        ],
      },
      {
        title: "Donations and rules",
        faqs: [
          { q: "What is a collection center?", a: "A physical point where in-kind donations are received, sorted and prepared to channel toward areas hit by an emergency. It doesn't hand aid to the final beneficiary: it prepares and consolidates the cargo for shipping." },
          { q: "What can be donated?", a: "Medicine, medical supplies, food, water, hygiene, tools and rescue gear — as long as they meet the quality rules (shelf life, sealed, not controlled)." },
          { q: "What is a homogeneous box and why does it matter?", a: "A box with a single product type, a single batch and a single expiry date. It's what makes the cargo traceable and acceptable inside a formal humanitarian shipment." },
          { q: "What rules apply to medicine?", a: "They follow WHO guidelines: minimum shelf life (≥ 365 days at intake), INN name, mandatory batch and expiry, and blocking of controlled substances." },
          { q: "What donations are rejected?", a: "Expired or soon-to-expire items, controlled medicines, and opened or unsealed products. The rules are enforced at intake, not after." },
        ],
      },
      {
        title: "Operations",
        faqs: [
          { q: "How does it work, from intake to shipment?", a: "Every donation is registered item by item, packed into homogeneous boxes with QR codes, the boxes consolidate into pallets, and the pallets into shipments with an exportable, customs-ready manifest." },
          { q: "What is a manifest or packing list?", a: "The detailed document of everything in a shipment, generated automatically from its pallets and boxes — what the humanitarian shipment regime requires to clear customs." },
          { q: "How do I add my collection center?", a: "From the registration or contact page you request to add your center; the team reviews the request and gives you access as a coordinator." },
          { q: "Can I coordinate several centers at once?", a: "Yes. The national dashboard adds up the stock of every connected center, and transfers let you move inventory between them." },
        ],
      },
      {
        title: "Privacy and data",
        faqs: [
          { q: "Does Araguaney store personal data of donors or beneficiaries?", a: "No. Araguaney only manages inventory, traceable from box to shipment. No personal data of donors or beneficiaries is stored." },
          { q: "Does Araguaney handle money or financial donations?", a: "No. Araguaney manages only in-kind donations and inventory; it does not handle money or financial donations." },
        ],
      },
    ],
    crossH2: "Keep exploring",
    crossLinks: [
      { routeKey: "centro-de-acopio", label: "Collection center software" },
      { routeKey: "guias", label: "Practical guides" },
      { routeKey: "alternativa-a-excel-para-donaciones", label: "A donation spreadsheet alternative" },
      { routeKey: "nosotros", label: "About Araguaney" },
    ],
    crumbHome: "Home",
    crumbSelf: "FAQ",
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

export default async function FaqHubPage({
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
  const allFaqs = c.groups.flatMap((g) => g.faqs)
  const structuredData = [faqSchema(allFaqs), breadcrumbSchema(crumbs)]

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
        <div className="px-5 md:px-[46px] pt-[26px] md:pt-[56px] pb-8 md:pb-[40px]">
          <div className="max-w-[680px] mx-auto">
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
              className="text-[30px] md:text-[42px] mb-4"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.3px", margin: "0 0 16px" }}
            >
              {c.h1}
            </h1>
            <p className="text-[14.5px] md:text-[17px]" style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: 560 }}>
              {c.heroP}
            </p>
          </div>
        </div>

        {/* ── FAQ groups ── */}
        {c.groups.map((group, i) => (
          <div
            key={group.title}
            className="px-5 md:px-[46px] py-10 md:py-[52px]"
            style={{ background: i % 2 === 0 ? "#fff" : "#FBF7EE", borderTop: "1px solid #EFE7D6" }}
          >
            <FaqSection items={group.faqs} title={group.title} />
          </div>
        ))}

        {/* ── Cross-links ── */}
        <div className="px-5 md:px-[46px] py-12 md:py-[56px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[680px] mx-auto">
            <h2 className="text-[20px] md:text-[24px] mb-5" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 20px" }}>
              {c.crossH2}
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-3">
              {c.crossLinks.map((l) => (
                <li key={l.routeKey}>
                  <Link href={localizedPath(l.routeKey, locale)} style={{ color: "#1F5E8C", fontWeight: 600, fontSize: 14.5 }}>
                    {l.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <HomeFooter dict={dict.footer} locale={locale} />
      </div>
    </>
  )
}
