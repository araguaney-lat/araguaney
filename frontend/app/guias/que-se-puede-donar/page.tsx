import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { getDictionary } from "@/lib/i18n"
import { DEFAULT_OG_IMAGE } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { articleSchema, breadcrumbSchema } from "@/lib/structured-data"

const PATH = "/guias/que-se-puede-donar"
const TITLE = "Qué se puede donar en un centro de acopio"
const DESCRIPTION =
  "Categorías aceptadas en un centro de acopio, reglas de la OMS para medicamentos y alimentos, y qué donaciones se rechazan y por qué."

const STRUCTURED_DATA = [
  articleSchema({ title: TITLE, description: DESCRIPTION, path: PATH }),
  breadcrumbSchema([
    { name: "Inicio", path: "/" },
    { name: "Guías", path: "/guias" },
    { name: TITLE, path: PATH },
  ]),
]

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
}

const CATEGORIAS = [
  { icon: "💊", title: "Medicamentos", desc: "Con INN, lote y caducidad. Mínimo 365 días de vida útil restante. Sin sustancias controladas." },
  { icon: "🩺", title: "Insumos médicos", desc: "Material de curación, guantes, mascarillas, jeringas — clasificados por el catálogo IFRC/ICRC." },
  { icon: "🥫", title: "Alimentos", desc: "No perecederos, mínimo 180 días de vida útil restante (configurable según el producto)." },
  { icon: "💧", title: "Agua", desc: "Embotellada o en garrafón, sellada de fábrica." },
  { icon: "🧼", title: "Higiene", desc: "Jabón, pasta dental, toallas sanitarias, pañales — sin abrir." },
  { icon: "🔧", title: "Herramientas", desc: "Palas, machetes, cascos — equipo para remoción de escombros y reconstrucción." },
  { icon: "🦺", title: "Equipo de rescate", desc: "Chalecos, linternas, cuerdas — según el catálogo IOM de artículos de emergencia." },
]

const NO_DONAR = [
  "Medicamentos con menos de 365 días de vida útil restante, o sin lote/caducidad legible.",
  "Sustancias controladas (bloqueadas automáticamente en el registro).",
  "Alimentos perecederos o sin fecha de caducidad verificable.",
  "Ropa usada o artículos que no correspondan a una categoría del catálogo de ayuda humanitaria.",
]

export default async function QueSePuedeDonarGuidePage() {
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
            Qué se puede donar en un centro de acopio
          </h1>

          <p className="text-[15px] md:text-[17px] mb-8" style={{ color: "#5C5347", lineHeight: 1.65 }}>
            No toda donación con buena intención es útil o segura para canalizar hacia una
            emergencia. Estas son las categorías que un centro de acopio bien organizado acepta —
            y las reglas detrás de cada una.
          </p>

          <h2 style={h2Style}>Categorías aceptadas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {CATEGORIAS.map((c) => (
              <div
                key={c.title}
                className="flex gap-3 items-start p-4"
                style={{ border: "1px solid #EEE6D4", borderRadius: 12, background: "#fff" }}
              >
                <span className="text-[22px] flex-none leading-none mt-0.5">{c.icon}</span>
                <div>
                  <p className="text-[14px] font-semibold mb-1" style={{ color: "#2B2723" }}>{c.title}</p>
                  <p className="text-[13px]" style={{ margin: 0, color: "#6E6557", lineHeight: 1.5 }}>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 style={h2Style}>Reglas de la OMS para medicamentos</h2>
          <p style={pStyle}>
            Siguiendo las WHO Guidelines for Medicine Donations, un medicamento solo se acepta si
            tiene al menos 365 días de vida útil restante a la fecha de recepción, y si se puede
            registrar con denominación INN, forma farmacéutica, concentración, lote y caducidad.
            Las sustancias controladas quedan bloqueadas — no se aceptan bajo ninguna circunstancia.
          </p>

          <h2 style={h2Style}>Reglas para alimentos</h2>
          <p style={pStyle}>
            Los alimentos donados deben tener al menos 180 días de vida útil restante (este umbral
            es configurable por tipo de producto). Deben ser no perecederos y venir en su empaque
            original y sellado.
          </p>

          <h2 style={h2Style}>Qué NO se puede donar</h2>
          <ul className="mb-8" style={{ paddingLeft: 20 }}>
            {NO_DONAR.map((item) => (
              <li key={item} className="text-[14.5px] mb-2" style={{ color: "#5C5347", lineHeight: 1.6 }}>
                {item}
              </li>
            ))}
          </ul>

          <div
            className="p-6 md:p-8 text-center"
            style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
          >
            <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
              Mira qué se necesita ahora mismo
            </p>
            <div className="flex flex-col md:flex-row gap-3 justify-center">
              <Link
                href="/necesidades"
                className="inline-flex items-center justify-center px-5 py-2.5"
                style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
              >
                Ver inventario disponible
              </Link>
              <Link
                href="/guias/como-organizar-un-centro-de-acopio"
                className="inline-flex items-center justify-center px-5 py-2.5"
                style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
              >
                Cómo organizar un centro de acopio
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
  margin: "0 0 8px",
}
