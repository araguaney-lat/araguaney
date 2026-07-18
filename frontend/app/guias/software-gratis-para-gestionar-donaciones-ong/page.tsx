import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { FaqSection } from "@/components/FaqSection"
import { getDictionary } from "@/lib/i18n"
import { DEFAULT_OG_IMAGE } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { articleSchema, faqSchema, breadcrumbSchema } from "@/lib/structured-data"

const PATH = "/guias/software-gratis-para-gestionar-donaciones-ong"
const TITLE = "Software gratis para gestionar donaciones en una ONG"
const DESCRIPTION =
  "Qué buscar en un software para gestionar donaciones en especie sin costo: registro por ítem, trazabilidad, manifiesto y agregación entre centros."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
}

const CRITERIOS = [
  { title: "Registro por ítem, no por bulto", desc: "Que capture cada donación con categoría, lote y caducidad — no solo \"3 cajas\". Sin esto no hay visibilidad real del inventario." },
  { title: "Trazabilidad de la caja al envío", desc: "Que cada caja, tarima y envío tenga su código y su historial de estados, para saber siempre dónde está cada cosa." },
  { title: "Manifiesto exportable", desc: "Que genere el packing list para aduana automáticamente, sin recapturar datos." },
  { title: "Reglas de donación integradas", desc: "Que valide caducidad y bloquee lo que no se puede donar (medicamentos vencidos, controlados) en el momento del registro." },
  { title: "Sin datos personales de por medio", desc: "Que no te obligue a registrar PII de donantes o beneficiarios — menos riesgo legal y menos fricción." },
  { title: "Agregación entre centros", desc: "Si operas más de un punto, que sume el stock de todos en un panel único. Es la diferencia entre un inventario y una coordinación." },
]

const FAQ = [
  {
    q: "¿Existe software gratis para gestionar donaciones en especie?",
    a: "Sí. Araguaney es gratuito para centros de acopio y coordinaciones humanitarias: registro por ítem, cajas con QR, manifiestos y panel agregado nacional, sin costo de licencia.",
  },
  {
    q: "¿Sirve una hoja de cálculo en vez de un software?",
    a: "Para un solo centro pequeño y por poco tiempo, puede alcanzar. Pero una hoja no valida reglas de donación, no genera QR ni manifiestos, y no agrega el stock de varios centros — que es justo lo que se necesita cuando la operación crece.",
  },
  {
    q: "¿Necesito instalar algo o servidores propios?",
    a: "No. Araguaney es una aplicación web: entras desde el navegador. El registro de donaciones incluso funciona sin conexión y sincroniza al recuperar internet.",
  },
  {
    q: "¿Puedo usarlo para cualquier tipo de emergencia?",
    a: "Sí. Aunque nació de un contexto específico, el estándar es genérico: sismos, inundaciones, incendios o crisis migratorias. No está atado a un solo evento.",
  },
]

const STRUCTURED_DATA = [
  articleSchema({ title: TITLE, description: DESCRIPTION, path: PATH }),
  faqSchema(FAQ),
  breadcrumbSchema([
    { name: "Inicio", path: "/" },
    { name: "Guías", path: "/guias" },
    { name: TITLE, path: PATH },
  ]),
]

export default async function SoftwareGratisGuidePage() {
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
              Software gratis para gestionar donaciones en una ONG
            </h1>

            <p className="text-[15px] md:text-[17px] mb-8" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              Cuando una ONG o un centro de acopio empieza a recibir donaciones en especie, la
              primera herramienta suele ser una hoja de cálculo. Funciona hasta que deja de
              funcionar: no valida caducidades, no genera etiquetas ni manifiestos, y no permite
              ver el inventario de varios puntos a la vez. Esta guía explica qué buscar en un
              software gratuito que sí resuelva eso.
            </p>

            <h2 style={h2Style}>Qué debe hacer un buen software de donaciones</h2>
            <div className="space-y-4 mb-8 mt-2">
              {CRITERIOS.map((c) => (
                <div key={c.title} className="p-4" style={{ border: "1px solid #EEE6D4", borderRadius: 12, background: "#fff" }}>
                  <p className="text-[14px] font-semibold mb-1" style={{ color: "#2B2723" }}>{c.title}</p>
                  <p className="text-[13.5px]" style={{ margin: 0, color: "#6E6557", lineHeight: 1.55 }}>{c.desc}</p>
                </div>
              ))}
            </div>

            <h2 style={h2Style}>Por qué "gratis" no debería significar "básico"</h2>
            <p style={pStyle}>
              Un software gratuito para el sector humanitario no tiene por qué ser una versión
              recortada. Araguaney es gratis para centros de acopio y ofrece el estándar completo:
              registro por ítem, cajas homogéneas con QR, tarimas, envíos con manifiesto exportable
              y un panel nacional que suma el stock de todos los centros. Sin licencias, sin límite
              de cajas, sin instalar servidores.
            </p>

            <div className="mt-10">
              <FaqSection items={FAQ} />
            </div>

            <div
              className="mt-10 p-6 md:p-8 text-center"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
                Empieza a gestionar tus donaciones con Araguaney, gratis
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <CtaLink
                  href="/login"
                  ctaLabel="guia_software_gratis_final"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  Empezar ahora
                </CtaLink>
                <Link
                  href="/centro-de-acopio"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  Ver el estándar completo
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
