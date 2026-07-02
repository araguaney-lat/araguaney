import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { getDictionary } from "@/lib/i18n"

const TITLE = "Software para centro de acopio"
const OG_TITLE = "Software para centro de acopio — Araguaney"
const DESCRIPTION =
  "Gestión de donaciones en especie para tu centro de acopio: registro por ítem, cajas homogéneas con QR, manifiesto exportable y panel nacional en tiempo real."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/centro-de-acopio" },
  openGraph: { title: OG_TITLE, description: DESCRIPTION },
  twitter: { title: OG_TITLE, description: DESCRIPTION },
}

const DIFERENCIADORES = [
  {
    icon: "📦",
    title: "Caja homogénea + QR",
    desc: "Un solo producto, lote y caducidad por caja. QR y etiqueta impresos al sellar — trazable de punta a punta.",
  },
  {
    icon: "📋",
    title: "Manifiesto exportable",
    desc: "Packing list lista para aduana en un clic, generada a partir de las tarimas y cajas de cada envío.",
  },
  {
    icon: "🗺️",
    title: "Panel nacional en tiempo real",
    desc: "Suma el stock de todos los centros de acopio conectados: qué hay, cuánto y dónde.",
  },
  {
    icon: "💊",
    title: "Validación de medicamentos",
    desc: "Vida útil mínima, denominación INN y bloqueo de sustancias controladas según lineamientos de la OMS.",
  },
  {
    icon: "🔒",
    title: "Sin datos personales",
    desc: "No se registra información de donantes ni beneficiarios. Solo inventario, trazable de la caja al envío.",
  },
]

export default async function CentroDeAcopioPage() {
  const dict = await getDictionary("es")

  return (
    <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <HomeNav dict={dict.nav} locale="es" localeLinks={{}} />
      <div className="h-[56px] md:hidden" />

      {/* ── Hero ── */}
      <div className="px-5 md:px-[46px] pt-[26px] md:pt-[64px] pb-10 md:pb-[56px]">
        <div className="max-w-[720px]">
          <div
            className="text-[10.5px] md:text-[12px] mb-3"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#B07D00",
              fontWeight: 700,
            }}
          >
            <span style={{ width: 18, height: 1.5, background: "#E0A100", display: "inline-block" }} />
            Software para centros de acopio
          </div>

          <h1
            className="text-[30px] md:text-[46px] mb-4"
            style={{
              fontFamily: "var(--font-source-serif)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.3px",
              margin: "0 0 16px",
            }}
          >
            El estándar para registrar, empacar y enviar donaciones de tu centro de acopio
          </h1>

          <p
            className="text-[14.5px] md:text-[17px] mb-8"
            style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: 560 }}
          >
            Araguaney registra cada donación en especie por ítem, la empaca en cajas homogéneas
            con QR, la consolida en tarimas y envíos con manifiesto exportable — el mismo
            estándar que usan decenas de centros de acopio para coordinarse entre sí.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center justify-center px-[26px] py-[14px]"
            style={{
              background: "#1F5E8C",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)",
              borderRadius: 99,
            }}
          >
            Sumar mi centro de acopio
          </Link>
        </div>
      </div>

      {/* ── Qué es un centro de acopio ── */}
      <div className="px-5 md:px-[46px] py-10 md:py-[56px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
        <div className="max-w-[720px] mx-auto">
          <h2
            className="text-[22px] md:text-[30px] mb-4"
            style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}
          >
            ¿Qué es un centro de acopio?
          </h2>
          <p className="text-[14.5px] md:text-[16px]" style={{ color: "#5C5347", lineHeight: 1.65 }}>
            Un centro de acopio recibe donaciones en especie — medicamentos, alimentos, agua,
            higiene, herramientas — para canalizarlas hacia zonas afectadas por una emergencia.
            Cuando varios centros operan cada uno con su propio método, es imposible saber qué
            hay disponible a nivel nacional o preparar un envío que cumpla las reglas de un
            régimen de ayuda humanitaria: cajas homogéneas y manifiesto detallado. Sin ese
            orden, los envíos se atoran.
          </p>
        </div>
      </div>

      {/* ── Diferenciadores ── */}
      <div className="px-5 md:px-[46px] py-12 md:py-[64px]" style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}>
        <div className="max-w-[880px] mx-auto">
          <h2
            className="text-[22px] md:text-[30px] mb-8 md:mb-10"
            style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 32px" }}
          >
            Todo lo que necesita un centro de acopio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {DIFERENCIADORES.map((item) => (
              <div
                key={item.title}
                className="flex gap-4 items-start p-5"
                style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
              >
                <span className="text-[26px] flex-none leading-none mt-0.5">{item.icon}</span>
                <div>
                  <h3
                    className="text-[15px] md:text-[16px] mb-1.5"
                    style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723", margin: "0 0 6px" }}
                  >
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

      {/* ── CTA final + link cruzado ── */}
      <div className="px-5 md:px-[46px] py-12 md:py-[64px] text-center" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
        <h2
          className="text-[22px] md:text-[28px] mb-4"
          style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}
        >
          Conecta tu centro de acopio con el estándar nacional
        </h2>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-[26px] py-[14px] mb-4"
          style={{
            background: "#1F5E8C",
            color: "#fff",
            fontWeight: 600,
            fontSize: 15,
            borderRadius: 99,
            boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)",
          }}
        >
          Sumar mi centro de acopio
        </Link>
        <p className="text-[13.5px] mb-2" style={{ color: "#8A8073" }}>
          ¿Coordinas ayuda para otro tipo de emergencia?{" "}
          <Link href="/ayuda-humanitaria" style={{ color: "#1F5E8C", fontWeight: 600 }}>
            Conoce Araguaney para ayuda humanitaria →
          </Link>
        </p>
        <p className="text-[13.5px]" style={{ color: "#8A8073" }}>
          <Link href="/guias/como-organizar-un-centro-de-acopio" style={{ color: "#1F5E8C", fontWeight: 600 }}>
            Guía: cómo organizar un centro de acopio →
          </Link>
        </p>
      </div>

      <HomeFooter dict={dict.footer} />
    </div>
  )
}
