import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { getDictionary } from "@/lib/i18n"
import { DEFAULT_OG_IMAGE } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { articleSchema, howToSchema, breadcrumbSchema } from "@/lib/structured-data"

const PATH = "/guias/sistema-de-inventario-para-damnificados"
const TITLE = "Sistema de inventario para damnificados en una emergencia"
const DESCRIPTION =
  "Cómo montar un inventario de ayuda para damnificados que sí sirva: registro por ítem, control de caducidad y visibilidad de qué falta en tiempo real."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
}

const HOWTO_STEPS = [
  {
    name: "Registra por ítem desde la primera donación",
    text: "Captura cada donación con categoría, lote y caducidad, no como bultos genéricos. Es lo que después permite responder qué hay y qué falta, no solo cuánto volumen entró.",
  },
  {
    name: "Aplica reglas de caducidad al recibir",
    text: "Rechaza medicamentos con menos de 365 días de vida útil y alimentos con menos de 180 días. Un inventario lleno de producto no distribuible no ayuda a nadie.",
  },
  {
    name: "Empaca en cajas homogéneas con etiqueta",
    text: "Un producto, un lote, una caducidad por caja, con código QR. Así el inventario se mantiene fiel cuando la carga se mueve entre bodega, tarima y envío.",
  },
  {
    name: "Publica qué falta en tiempo real",
    text: "Expón el inventario disponible por categoría para que donantes y coordinadores vean qué se necesita realmente, y no llegue más de lo que sobra.",
  },
]

const STRUCTURED_DATA = [
  articleSchema({ title: TITLE, description: DESCRIPTION, path: PATH }),
  howToSchema({ name: TITLE, description: DESCRIPTION, path: PATH, steps: HOWTO_STEPS }),
  breadcrumbSchema([
    { name: "Inicio", path: "/" },
    { name: "Guías", path: "/guias" },
    { name: TITLE, path: PATH },
  ]),
]

export default async function InventarioDamnificadosGuidePage() {
  const dict = await getDictionary("es")

  return (
    <>
      <JsonLd data={STRUCTURED_DATA} />
      <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <HomeNav dict={dict.nav} locale="es" localeLinks={{}} />
        <div className="h-[56px] md:hidden" />

        <article className="px-5 md:px-[46px] pt-[26px] md:pt-[56px] pb-16 md:pb-20">
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
              Guía
            </div>

            <h1
              className="text-[28px] md:text-[38px] mb-5"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.15, margin: "0 0 20px" }}
            >
              Sistema de inventario para damnificados
            </h1>

            <p className="text-[15px] md:text-[17px] mb-8" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              Tras un desastre, la ayuda llega en avalancha y sin orden. El problema no suele ser la
              falta de donaciones, sino la falta de un inventario que diga qué hay realmente
              disponible y qué falta. Esta guía explica cómo montar ese inventario para que la ayuda
              llegue a los damnificados ordenada y a tiempo.
            </p>

            <h2 style={h2Style}>El error más común: contar volumen, no ítems</h2>
            <p style={pStyle}>
              Un inventario que dice "20 cajas de medicamentos" no sirve para coordinar: no sabes
              qué medicamentos, en qué cantidad, con qué caducidad. Cuando llega el momento de
              preparar un envío o responder qué se necesita, esa información no está. Registrar por
              ítem desde el inicio es lo que evita ese callejón sin salida.
            </p>

            <h2 style={h2Style}>Cómo montar un inventario que sí sirva</h2>
            <ol className="space-y-4 mb-8 mt-3" style={{ listStyle: "none", padding: 0, margin: "12px 0 32px" }}>
              {HOWTO_STEPS.map((step, i) => (
                <li key={step.name} className="p-4" style={{ border: "1px solid #EEE6D4", borderRadius: 12, background: "#fff" }}>
                  <p className="text-[14px] font-semibold mb-1" style={{ color: "#2B2723" }}>
                    {i + 1}. {step.name}
                  </p>
                  <p className="text-[13.5px]" style={{ margin: 0, color: "#6E6557", lineHeight: 1.55 }}>{step.text}</p>
                </li>
              ))}
            </ol>

            <h2 style={h2Style}>De inventario a coordinación</h2>
            <p style={pStyle}>
              Un inventario aislado ayuda a un centro; una coordinación ayuda a una región. Cuando
              varios puntos usan el mismo estándar, su stock se puede sumar en un panel único y
              responder, a nivel nacional, qué falta y dónde. Ese salto — de inventario a
              agregación — es el que convierte donaciones dispersas en respuesta ordenada.
            </p>

            <div
              className="mt-10 p-6 md:p-8 text-center"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
                Monta tu inventario de ayuda con Araguaney
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <CtaLink
                  href="/login"
                  ctaLabel="guia_inventario_damnificados_final"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  Empezar ahora
                </CtaLink>
                <Link
                  href="/necesidades"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  Ver qué falta ahora mismo
                </Link>
              </div>
            </div>
          </div>
        </article>

        <HomeFooter dict={dict.footer} />
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
