import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { getDictionary } from "@/lib/i18n"

const TITLE = "Cómo organizar un centro de acopio"
const DESCRIPTION =
  "Guía práctica para organizar un centro de acopio desde cero: roles, registro de donaciones, cajas homogéneas, manifiesto y reglas de rechazo."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guias/como-organizar-un-centro-de-acopio" },
  openGraph: { title: `${TITLE} — Araguaney`, description: DESCRIPTION },
  twitter: { title: `${TITLE} — Araguaney`, description: DESCRIPTION },
}

const FAQ = [
  {
    q: "¿Cuántas personas se necesitan para operar un centro de acopio?",
    a: "Con 2-3 voluntarios y un coordinador es suficiente para empezar: alguien recibe y registra, alguien empaca y sella cajas, y el coordinador consolida tarimas y gestiona envíos.",
  },
  {
    q: "¿Qué pasa si llega una donación mixta (varios productos en una misma bolsa)?",
    a: "Se separa por producto, lote y caducidad al registrar — cada combinación distinta se convierte en su propia caja homogénea. Nunca se mezcla más de un producto en una caja.",
  },
  {
    q: "¿Se puede operar sin conexión a internet?",
    a: "El registro de donaciones funciona offline y se sincroniza cuando vuelve la conexión. Las operaciones que requieren validación en tiempo real (como crear un nuevo tipo de producto) sí requieren conexión.",
  },
  {
    q: "¿Qué hago si un medicamento no cumple la vida útil mínima?",
    a: "Se rechaza en el registro — Araguaney bloquea automáticamente medicamentos con menos de 365 días de vida útil restante, siguiendo los lineamientos de la OMS para donación de medicamentos.",
  },
]

const FAQ_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
}

export default async function ComoOrganizarGuidePage() {
  const dict = await getDictionary("es")

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_STRUCTURED_DATA) }}
      />
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
              Cómo organizar un centro de acopio
            </h1>

            <p className="text-[15px] md:text-[17px] mb-8" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              Un centro de acopio recibe donaciones en especie — medicamentos, alimentos, agua,
              higiene, herramientas — para canalizarlas hacia zonas afectadas por una emergencia.
              Esta guía cubre lo esencial para organizarlo bien desde el primer día, sin importar
              si es tu primer centro o si ya llevas semanas operando de forma improvisada.
            </p>

            <h2 style={h2Style}>1. Define roles antes de recibir la primera donación</h2>
            <p style={pStyle}>
              Con 2-3 voluntarios y un coordinador es suficiente para empezar. Separa las
              responsabilidades: alguien recibe y registra cada donación, alguien empaca y sella
              cajas, y el coordinador consolida tarimas y gestiona los envíos. Sin esta división,
              es fácil perder trazabilidad desde el primer día.
            </p>

            <h2 style={h2Style}>2. Registra cada ítem, no solo "bultos"</h2>
            <p style={pStyle}>
              El error más común de un centro improvisado es contar donaciones en cajas o bolsas
              genéricas ("3 cajas de medicamentos") en vez de por ítem. Registra cada donación con
              su categoría, lote y fecha de caducidad. Esto es lo que permite después saber
              exactamente qué hay disponible — no solo cuánto volumen.
            </p>

            <h2 style={h2Style}>3. Empaca en cajas homogéneas</h2>
            <p style={pStyle}>
              Una caja homogénea contiene un solo tipo de producto, un solo lote y una sola fecha
              de caducidad — sin mezclas. Cada caja sellada recibe un código QR y una etiqueta.
              Esto no es burocracia: es exactamente lo que exige el régimen de envío humanitario
              para que la carga no se atore en aduana.
            </p>

            <h2 style={h2Style}>4. Consolida en tarimas y genera el manifiesto</h2>
            <p style={pStyle}>
              Las cajas selladas se agrupan en tarimas (mixtas, pueden llevar distintos
              productos). Cuando el envío está listo, se genera un manifiesto exportable —
              packing list con cada caja y tarima — listo para el trámite aduanal.
            </p>

            <h2 style={h2Style}>5. Conoce las reglas de rechazo antes de que lleguen donaciones</h2>
            <p style={pStyle}>
              No todo lo que se dona se puede aceptar. Los medicamentos con menos de 365 días de
              vida útil restante se rechazan (lineamientos de la OMS para donación de
              medicamentos), igual que las sustancias controladas. Los alimentos requieren al
              menos 180 días de vida útil restante. Conocer estas reglas de antemano evita
              conflictos incómodos al momento de recibir una donación.
            </p>

            <h2 style={h2Style}>Preguntas frecuentes</h2>
            <div className="space-y-5 mb-10">
              {FAQ.map((f) => (
                <div key={f.q}>
                  <h3
                    className="text-[15px] md:text-[16px] mb-1.5"
                    style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723" }}
                  >
                    {f.q}
                  </h3>
                  <p className="text-[14px]" style={{ color: "#6E6557", lineHeight: 1.6, margin: 0 }}>
                    {f.a}
                  </p>
                </div>
              ))}
            </div>

            <div
              className="p-6 md:p-8 text-center"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
                Aplica este estándar en tu centro de acopio con Araguaney
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <Link
                  href="/centro-de-acopio"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{
                    background: "#1F5E8C",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    borderRadius: 99,
                  }}
                >
                  Ver el estándar completo
                </Link>
                <Link
                  href="/necesidades"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{
                    border: "1.5px solid #E6D4A6",
                    color: "#2B2723",
                    fontWeight: 600,
                    fontSize: 14,
                    borderRadius: 99,
                  }}
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
