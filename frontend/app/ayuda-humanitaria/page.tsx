import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { FaqSection } from "@/components/FaqSection"
import { getDictionary } from "@/lib/i18n"
import { DEFAULT_OG_IMAGE } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { faqSchema, breadcrumbSchema } from "@/lib/structured-data"

const TITLE = "Software de ayuda humanitaria"
const OG_TITLE = "Software de ayuda humanitaria — Araguaney"
const DESCRIPTION =
  "Software para donaciones de emergencia: registro, cajas homogéneas con QR y manifiesto exportable para cualquier escenario de ayuda humanitaria — sismos, inundaciones, crisis migratorias e incendios."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ayuda-humanitaria", languages: { en: "/humanitarian-aid" } },
  openGraph: { title: OG_TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title: OG_TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
}

const ESCENARIOS = [
  { icon: "🌎", title: "Sismos", desc: "Coordina la recepción y envío de suministros entre centros tras un terremoto." },
  { icon: "🌊", title: "Inundaciones", desc: "Registra y clasifica donaciones a medida que llegan desde múltiples puntos de acopio." },
  { icon: "🧳", title: "Crisis migratorias", desc: "Estandariza el inventario de ayuda para poblaciones desplazadas en tránsito." },
  { icon: "🔥", title: "Incendios", desc: "Organiza la respuesta rápida sin perder trazabilidad de lo que se dona y envía." },
]

const FAQ = [
  {
    q: "¿Para qué tipo de emergencias sirve Araguaney?",
    a: "Para cualquier escenario de ayuda humanitaria: sismos, inundaciones, incendios o crisis migratorias. El estándar de registro, empaque y envío es el mismo, sin importar el evento.",
  },
  {
    q: "¿Qué es una caja homogénea y por qué importa?",
    a: "Es una caja con un solo producto, un solo lote y una sola caducidad. Es lo que exige el régimen de envío humanitario para que la carga pueda verificarse en aduana sin abrirse, y no se atore.",
  },
  {
    q: "¿Araguaney gestiona dinero o beneficiarios?",
    a: "No. Solo gestiona inventario de donaciones en especie, trazable de la caja al envío. No maneja donativos económicos ni registra datos de beneficiarios finales.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "Es gratuito para centros de acopio y coordinaciones humanitarias, sin límite de cajas ni costo de licencia.",
  },
]

const STRUCTURED_DATA = [
  faqSchema(FAQ),
  breadcrumbSchema([
    { name: "Inicio", path: "/" },
    { name: "Ayuda humanitaria", path: "/ayuda-humanitaria" },
  ]),
]

export default async function AyudaHumanitariaPage() {
  const dict = await getDictionary("es")

  return (
    <>
    <JsonLd data={STRUCTURED_DATA} />
    <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <HomeNav dict={dict.nav} locale="es" localeLinks={{ en: "/humanitarian-aid" }} />
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
              color: "#946A00",
              fontWeight: 700,
            }}
          >
            <span style={{ width: 18, height: 1.5, background: "#906400", display: "inline-block" }} />
            Ayuda humanitaria
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
            Software de ayuda humanitaria para cualquier tipo de emergencia
          </h1>

          <p
            className="text-[14.5px] md:text-[17px] mb-8"
            style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: 560 }}
          >
            Desde sismos hasta inundaciones, crisis migratorias o incendios: Araguaney
            estandariza el registro, empaque y envío de donaciones en especie para cualquier
            centro de acopio, en cualquier emergencia — no está atado a un solo evento.
          </p>

          <CtaLink
            href="/login"
            ctaLabel="ayuda_humanitaria_hero"
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
            Empezar ahora
          </CtaLink>
        </div>
      </div>

      {/* ── Escenarios ── */}
      <div className="px-5 md:px-[46px] py-12 md:py-[64px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
        <div className="max-w-[880px] mx-auto">
          <h2
            className="text-[22px] md:text-[30px] mb-8 md:mb-10"
            style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 32px" }}
          >
            Diseñado para cualquier escenario
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {ESCENARIOS.map((item) => (
              <div
                key={item.title}
                className="flex gap-4 items-start p-5"
                style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#FCFAF4" }}
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

      {/* ── Un mismo estándar ── */}
      <div className="px-5 md:px-[46px] py-10 md:py-[56px]" style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}>
        <div className="max-w-[720px] mx-auto">
          <h2
            className="text-[22px] md:text-[28px] mb-4"
            style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}
          >
            Un mismo estándar, cualquier emergencia
          </h2>
          <p className="text-[14.5px] md:text-[16px]" style={{ color: "#5C5347", lineHeight: 1.65 }}>
            Araguaney no está diseñado para un desastre específico. Registra donaciones por
            categoría, lote y caducidad, las empaca en cajas homogéneas con QR, y las consolida
            en tarimas y envíos con manifiesto exportable — apoyado en estándares reconocidos
            (OMS, IFRC/ICRC, IOM, UNSPSC, GS1) que garantizan la calidad del inventario sin
            importar el tipo de emergencia que lo origine.
          </p>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="px-5 md:px-[46px] py-12 md:py-[56px]" style={{ borderTop: "1px solid #EFE7D6" }}>
        <FaqSection items={FAQ} />
      </div>

      {/* ── CTA final + link cruzado ── */}
      <div className="px-5 md:px-[46px] py-12 md:py-[64px] text-center" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
        <h2
          className="text-[22px] md:text-[28px] mb-4"
          style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}
        >
          Prepárate antes de que llegue la próxima emergencia
        </h2>
        <CtaLink
          href="/login"
          ctaLabel="ayuda_humanitaria_final"
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
          Empezar ahora
        </CtaLink>
        <p className="text-[13.5px] mb-2" style={{ color: "#6E6557" }}>
          ¿Coordinas específicamente un centro de acopio?{" "}
          <Link href="/centro-de-acopio" style={{ color: "#1F5E8C", fontWeight: 600 }}>
            Conoce el estándar completo →
          </Link>
        </p>
        <p className="text-[13.5px]" style={{ color: "#6E6557" }}>
          <Link href="/guias/que-se-puede-donar" style={{ color: "#1F5E8C", fontWeight: 600 }}>
            Qué se puede donar
          </Link>
          {" · "}
          <Link href="/guias/como-preparar-carga-humanitaria-para-aduana" style={{ color: "#1F5E8C", fontWeight: 600 }}>
            Cómo preparar carga para aduana
          </Link>
        </p>
      </div>

      <HomeFooter dict={dict.footer} />
    </div>
    </>
  )
}
