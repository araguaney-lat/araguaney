import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl } from "@/lib/seo"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { JsonLd } from "@/components/JsonLd"
import { articleSchema, howToSchema, breadcrumbSchema } from "@/lib/structured-data"

const PATH = "/guias/como-registrar-voluntarios-en-un-centro-de-acopio"
const TITLE = "Cómo registrar y organizar voluntarios en un centro de acopio"
const DESCRIPTION =
  "Cómo estructurar los roles de los voluntarios de un centro de acopio para no perder trazabilidad: quién recibe, quién empaca y quién coordina."
const OG_IMAGE = ogImageUrl(TITLE, "Guía")

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [OG_IMAGE] },
}

const HOWTO_STEPS = [
  {
    name: "Define los tres roles básicos",
    text: "Voluntario que recibe y registra donaciones, voluntario que empaca y sella cajas, y coordinador que consolida tarimas y gestiona envíos. Con 2-3 voluntarios y un coordinador se puede arrancar.",
  },
  {
    name: "Da a cada voluntario su propia cuenta",
    text: "Cada persona opera con su usuario, no con uno compartido. Así cada acción — registrar, sellar, cerrar una tarima — queda atribuida a quien la hizo, sin ambigüedad.",
  },
  {
    name: "Asigna permisos según el rol",
    text: "El voluntario registra y sella; el coordinador además cierra tarimas y envíos y genera manifiestos. Limitar permisos evita errores irreversibles bajo presión.",
  },
  {
    name: "Mantén la trazabilidad de cada acción",
    text: "Cada cambio de estado (caja sellada, tarima cerrada, envío despachado) deja registro de quién y cuándo. Eso permite auditar la operación y resolver dudas después.",
  },
]

const CRUMBS = [
  { name: "Inicio", path: "/" },
  { name: "Guías", path: "/guias" },
  { name: TITLE, path: PATH },
] as const

const STRUCTURED_DATA = [
  articleSchema({ title: TITLE, description: DESCRIPTION, path: PATH }),
  howToSchema({ name: TITLE, description: DESCRIPTION, path: PATH, steps: HOWTO_STEPS }),
  breadcrumbSchema(CRUMBS),
]

export default async function VoluntariosGuidePage() {
  const dict = await getDictionary("es")

  return (
    <>
      <JsonLd data={STRUCTURED_DATA} />
      <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <HomeNav dict={dict.nav} locale="es" localeLinks={{}} />
        <div className="h-[56px] md:hidden" />

        <article className="px-5 md:px-[46px] pt-[26px] md:pt-[56px] pb-16 md:pb-20">
          <div className="max-w-[680px] mx-auto">
            <div className="mb-4">
              <Breadcrumbs items={CRUMBS} />
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
              Guía
            </div>

            <h1
              className="text-[28px] md:text-[38px] mb-5"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.15, margin: "0 0 20px" }}
            >
              Cómo registrar y organizar voluntarios
            </h1>

            <p className="text-[15px] md:text-[17px] mb-8" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              Un centro de acopio se mueve gracias a sus voluntarios, pero sin una estructura clara
              de roles es fácil perder trazabilidad desde el primer día: donaciones sin registrar,
              cajas sin sellar, nadie seguro de quién hizo qué. Esta guía explica cómo organizar y
              registrar a los voluntarios para que la operación se mantenga ordenada.
            </p>

            <h2 style={h2Style}>Separar responsabilidades antes que sumar manos</h2>
            <p style={pStyle}>
              El instinto en una emergencia es sumar voluntarios lo más rápido posible. Pero sin
              roles definidos, más manos significan más confusión. Lo primero no es cuántos son,
              sino que cada quien sepa exactamente qué le toca: recibir, empacar o coordinar.
            </p>

            <h2 style={h2Style}>Cómo organizar a los voluntarios paso a paso</h2>
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

            <h2 style={h2Style}>Por qué las cuentas individuales importan</h2>
            <p style={pStyle}>
              Compartir un solo usuario "del centro" ahorra un minuto al inicio y cuesta horas
              después: cuando algo no cuadra, nadie sabe quién lo hizo. Con una cuenta por
              voluntario y permisos por rol, cada acción queda atribuida y la operación se puede
              auditar sin señalar a ciegas.
            </p>

            <div
              className="mt-10 p-6 md:p-8 text-center"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
                Organiza a tu equipo con Araguaney
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <CtaLink
                  href="/login"
                  ctaLabel="guia_voluntarios_final"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  Empezar ahora
                </CtaLink>
                <Link
                  href="/guias/como-organizar-un-centro-de-acopio"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  Guía: organizar un centro de acopio
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
