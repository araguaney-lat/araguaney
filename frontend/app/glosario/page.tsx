import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { getDictionary } from "@/lib/i18n"
import { DEFAULT_OG_IMAGE } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { definedTermSetSchema, breadcrumbSchema, type Schema } from "@/lib/structured-data"

const PATH = "/glosario"
const TITLE = "Glosario de ayuda humanitaria y centros de acopio"
const DESCRIPTION =
  "Definiciones claras de los términos clave de la logística humanitaria: centro de acopio, caja homogénea, tarima, manifiesto, INN, UNSPSC, GS1 y más."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
}

const TERMS = [
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
      "Un bulto es una caja o bolsa genérica contada por volumen (\"3 cajas de medicamentos\"). Una caja homogénea se cuenta por ítem con lote y caducidad. La diferencia es lo que permite saber qué hay disponible, no solo cuánto.",
  },
  {
    term: "INN (Denominación Común Internacional)",
    definition:
      "Nombre genérico oficial de un principio activo farmacéutico, definido por la OMS (por ejemplo, \"ibuprofeno\"). Es obligatorio para sellar una caja de medicamentos, porque identifica el fármaco sin depender de marcas comerciales.",
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
] as const

const STRUCTURED_DATA: Schema[] = [
  definedTermSetSchema(TITLE, PATH, TERMS),
  breadcrumbSchema([
    { name: "Inicio", path: "/" },
    { name: "Glosario", path: PATH },
  ]),
]

export default async function GlosarioPage() {
  const dict = await getDictionary("es")

  return (
    <>
      <JsonLd data={STRUCTURED_DATA} />
      <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <HomeNav dict={dict.nav} locale="es" localeLinks={{}} />
        <div className="h-[56px] md:hidden" />

        <div className="px-5 md:px-[46px] pt-[26px] md:pt-[56px] pb-16 md:pb-20 flex-1">
          <div className="max-w-[680px] mx-auto">
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
              Glosario
            </div>

            <h1
              className="text-[28px] md:text-[38px] mb-4"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.15, margin: "0 0 16px" }}
            >
              Glosario de ayuda humanitaria
            </h1>

            <p className="text-[15px] md:text-[17px] mb-9" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              Los términos clave de la logística de donaciones y centros de acopio, explicados en
              lenguaje claro. Basados en estándares reconocidos (OMS, IFRC/ICRC, IOM, UNSPSC, GS1).
            </p>

            <dl className="space-y-6">
              {TERMS.map((entry) => (
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
                ¿Empezando un centro de acopio? Estas guías te ayudan
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <Link
                  href="/guias"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  Ver las guías
                </Link>
                <Link
                  href="/centro-de-acopio"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  Conoce el estándar
                </Link>
              </div>
            </div>
          </div>
        </div>

        <HomeFooter dict={dict.footer} />
      </div>
    </>
  )
}
