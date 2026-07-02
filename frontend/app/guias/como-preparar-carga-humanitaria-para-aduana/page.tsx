import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { getDictionary } from "@/lib/i18n"
import { DEFAULT_OG_IMAGE } from "@/lib/seo"

const TITLE = "Cómo preparar carga humanitaria para aduana"
const DESCRIPTION =
  "Qué exige el régimen de envío humanitario, qué debe incluir un manifiesto/packing list, y los errores más comunes que atoran un envío en aduana."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guias/como-preparar-carga-humanitaria-para-aduana" },
  openGraph: { title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
}

const ERRORES = [
  { title: "Cajas mixtas", desc: "Una caja con varios productos, lotes o caducidades distintas — aduana no puede verificar el contenido con precisión." },
  { title: "Sin manifiesto detallado", desc: "Un envío sin packing list caja por caja obliga a una inspección física completa, retrasando el despacho días o semanas." },
  { title: "Códigos de material inconsistentes", desc: "No usar una clasificación reconocida (IFRC/ICRC, UNSPSC) dificulta que la aduana entienda qué se está enviando." },
  { title: "Sin trazabilidad de lote/caducidad en medicamentos", desc: "Los medicamentos sin esta información suelen ser rechazados directamente por la autoridad sanitaria del país receptor." },
]

export default async function AduanaGuidePage() {
  const dict = await getDictionary("es")

  return (
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
            Cómo preparar carga humanitaria para aduana
          </h1>

          <p className="text-[15px] md:text-[17px] mb-8" style={{ color: "#5C5347", lineHeight: 1.65 }}>
            Una carga humanitaria mal documentada se atora en aduana — no por mala fe de nadie,
            sino porque la autoridad aduanal no puede verificar rápido qué contiene cada bulto.
            Esta guía explica qué exige el régimen de envío y cómo evitar los errores más comunes.
          </p>

          <h2 style={h2Style}>El régimen: cajas homogéneas + manifiesto detallado</h2>
          <p style={pStyle}>
            El requisito central es simple de enunciar y difícil de improvisar bajo presión: cada
            caja debe contener un solo tipo de producto, un solo lote y una sola caducidad, y el
            envío completo debe venir acompañado de un manifiesto que liste cada caja y su
            contenido. Sin ese orden, los envíos se atoran.
          </p>

          <h2 style={h2Style}>Qué debe incluir un manifiesto</h2>
          <p style={pStyle}>
            Un manifiesto (packing list) humanitario completo incluye, por cada caja: código de
            material o clasificación reconocida (IFRC/ICRC, UNSPSC), descripción del producto,
            cantidad, unidad y peso. A nivel de envío, debe listar también las tarimas que agrupan
            esas cajas y el peso total consolidado.
          </p>

          <h2 style={h2Style}>Cómo Araguaney genera el manifiesto automáticamente</h2>
          <p style={pStyle}>
            Como cada caja ya se registró y selló como homogénea — con su producto, lote y
            caducidad — el manifiesto se genera directamente a partir de las tarimas y cajas del
            envío, sin captura manual adicional. El resultado es un PDF exportable listo para
            aduana, y opcionalmente un Excel con columnas alineadas al formato IFRC.
          </p>

          <h2 style={h2Style}>Errores comunes que atoran un envío</h2>
          <div className="space-y-4 mb-8">
            {ERRORES.map((e) => (
              <div
                key={e.title}
                className="p-4"
                style={{ border: "1px solid #EEE6D4", borderRadius: 12, background: "#fff" }}
              >
                <p className="text-[14px] font-semibold mb-1" style={{ color: "#2B2723" }}>{e.title}</p>
                <p className="text-[13.5px]" style={{ margin: 0, color: "#6E6557", lineHeight: 1.55 }}>{e.desc}</p>
              </div>
            ))}
          </div>

          <div
            className="p-6 md:p-8 text-center"
            style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
          >
            <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
              Genera manifiestos exportables desde el primer envío
            </p>
            <div className="flex flex-col md:flex-row gap-3 justify-center">
              <CtaLink
                href="/login"
                ctaLabel="guia_aduana_final"
                className="inline-flex items-center justify-center px-5 py-2.5"
                style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
              >
                Empezar ahora
              </CtaLink>
              <Link
                href="/ayuda-humanitaria"
                className="inline-flex items-center justify-center px-5 py-2.5"
                style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
              >
                Conoce Araguaney
              </Link>
            </div>
          </div>
        </div>
      </article>

      <HomeFooter dict={dict.footer} />
    </div>
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
