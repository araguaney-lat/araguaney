import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl } from "@/lib/seo"
import { JsonLd } from "@/components/JsonLd"
import { howToSchema, breadcrumbSchema, type Schema } from "@/lib/structured-data"

const PATH = "/como-funciona"
const TITLE = "Cómo funciona Araguaney"
const DESCRIPTION =
  "El flujo completo, del acopio al envío: registrar donaciones por ítem, empacarlas en cajas homogéneas con QR, consolidarlas en tarimas y envíos con manifiesto, y ver el stock nacional en tiempo real."
const OG_IMAGE = ogImageUrl("Cómo funciona Araguaney", "Cómo funciona")

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: `${TITLE} — Araguaney`, description: DESCRIPTION, images: [OG_IMAGE] },
}

const STAGES = [
  { n: "1", title: "Recepción", desc: "Se registra la donación por ítem: producto, cantidad, lote, caducidad.", d: "M3 12h4l2 3h6l2-3h4 M5 12V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6 M3 12v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" },
  { n: "2", title: "Caja", desc: "Un producto, un lote, una caducidad. Se sella con QR y etiqueta.", d: "M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z M3 7.5 12 12l9-4.5 M12 12v9" },
  { n: "3", title: "Tarima", desc: "Agrupa cajas selladas. Puede ser mixta. También tiene su QR.", d: "M4 5h16v4H4z M4 11h16v4H4z M7 15v4 M17 15v4 M7 19h10" },
  { n: "4", title: "Envío", desc: "Agrupa tarimas cerradas. Al despacharse, se congela todo.", d: "M3 6h11v9H3z M14 9h4l3 3v3h-7z M7 18a1.6 1.6 0 1 0 .01 0 M17.5 18a1.6 1.6 0 1 0 .01 0" },
  { n: "5", title: "Manifiesto", desc: "Packing list exportable, caja por caja, listo para aduana.", d: "M6 3h9l4 4v14H6z M14 3v5h5 M9 13h7 M9 17h7" },
] as const

const CONCEPTS = [
  { h: "Caja homogénea", p: "Un solo producto, un solo lote y una sola caducidad por caja. Es lo que permite verificar el contenido sin abrirla — el requisito clave del envío humanitario." },
  { h: "Tarima", p: "Agrupa cajas selladas para transporte. Puede llevar distintos productos. Tiene su propio código QR para seguirla." },
  { h: "Envío", p: "Agrupa tarimas y genera el manifiesto. Al despacharse, congela su contenido para conservar la trazabilidad." },
  { h: "Panel nacional", p: "Suma el stock disponible de todos los centros conectados: qué hay, cuánto y dónde, en tiempo real." },
] as const

const TRACKS = [
  { name: "Caja", steps: ["Registrada", "Sellada", "Enviada"] },
  { name: "Tarima", steps: ["Abierta", "Cerrada", "Enviada"] },
  { name: "Envío", steps: ["Abierto", "Cerrado", "Despachado"] },
] as const

const RULES = [
  { n: "01", h: "Caja homogénea", p: "Una caja lleva un solo producto, lote y caducidad. Si llega una mezcla, se separa en varias cajas." },
  { n: "02", h: "Vida útil mínima", p: "Medicamentos: al menos 365 días restantes (lineamientos de la OMS). Alimentos y agua: al menos 180 días. Por debajo, la donación se rechaza." },
  { n: "03", h: "Medicamentos identificados", p: "Se exige denominación (INN), forma, concentración y lote. Sin eso, no se puede sellar." },
  { n: "04", h: "Controlados bloqueados", p: "Los productos controlados se rechazan al momento de recibir, sin excepción." },
] as const

const STANDARDS = [
  { a: "WHO", p: "Lineamientos de la OMS para la donación de medicamentos." },
  { a: "IFRC/ICRC", p: "Catálogo de materiales de emergencia con código y especificaciones." },
  { a: "IOM", p: "Catálogo de artículos de emergencia (Emergency Relief Items)." },
  { a: "UNSPSC", p: "Taxonomía internacional de categorías de producto, en español." },
  { a: "GS1", p: "Códigos de barras (GTIN) para validar y autocompletar productos." },
] as const

const STRUCTURED_DATA: Schema[] = [
  howToSchema({
    name: "Cómo funciona Araguaney, del acopio al envío",
    description: DESCRIPTION,
    path: PATH,
    steps: STAGES.map((s) => ({ name: s.title, text: s.desc })),
  }),
  breadcrumbSchema([
    { name: "Inicio", path: "/" },
    { name: "Cómo funciona", path: PATH },
  ]),
]

const eyebrowStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 9, fontSize: 12, fontWeight: 700,
  letterSpacing: "0.14em", textTransform: "uppercase", color: "#946A00",
}
const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.15,
  letterSpacing: "-0.01em", margin: "8px 0 0", color: "#2B2723",
}
const sectNote: React.CSSProperties = { color: "#5C5347", fontSize: 15, margin: "8px 0 0", maxWidth: "60ch", lineHeight: 1.55 }

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span style={eyebrowStyle}>
      <span style={{ width: 22, height: 2, background: "#906400", borderRadius: 2, display: "inline-block" }} />
      {children}
    </span>
  )
}

export default async function ComoFuncionaPage() {
  const dict = await getDictionary("es")

  return (
    <>
      <JsonLd data={STRUCTURED_DATA} />
      <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <HomeNav dict={dict.nav} locale="es" localeLinks={{}} />
        <div className="h-[56px] md:hidden" />

        <div className="px-5 md:px-[46px] pt-[26px] md:pt-[56px] pb-16 md:pb-20 flex-1">
          <div className="max-w-[860px] mx-auto">

            {/* ── Hero ── */}
            <Eyebrow>Cómo funciona</Eyebrow>
            <h1
              className="text-[30px] md:text-[46px] mt-4 mb-4"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.01em", textWrap: "balance" }}
            >
              Que cada donación llegue ordenada
            </h1>
            <p className="text-[16px] md:text-[19px]" style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: "62ch" }}>
              Araguaney le da a los centros de acopio un mismo estándar para recibir donaciones en especie,
              empacarlas con control de calidad y prepararlas para enviar — con trazabilidad de la caja al
              envío y un panel que suma el stock de todos los centros.
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              {["Gratis para centros de acopio", "Para cualquier emergencia", "Sin datos personales"].map((t) => (
                <span key={t} className="text-[12.5px]" style={{ fontWeight: 600, color: "#6E6557", background: "#fff", border: "1px solid #EEE6D4", borderRadius: 999, padding: "5px 13px" }}>
                  {t}
                </span>
              ))}
            </div>

            {/* ── Pipeline ── */}
            <section className="mt-14 md:mt-[72px]">
              <Eyebrow>El flujo</Eyebrow>
              <h2 className="text-[22px] md:text-[30px]" style={h2Style}>Del acopio al envío, en cinco pasos</h2>
              <p style={sectNote}>Cada donación recorre el mismo camino. El orden es lo que hace que la carga no se atore: nada avanza hasta que la pieza anterior está lista.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 mt-6 p-4 md:p-6" style={{ background: "#fff", border: "1px solid #EEE6D4", borderRadius: 18 }}>
                {STAGES.map((s) => (
                  <div key={s.n} className="flex md:block items-center gap-3 p-2.5 md:text-center">
                    <div className="md:mx-auto md:mb-3" style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", background: "#F6EFDF", border: "1px solid #EEE6D4", color: "#1F5E8C", flex: "none" }}>
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        {s.d.split(" M").map((seg, i) => <path key={i} d={i === 0 ? seg : `M${seg}`} />)}
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[14px]" style={{ fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 3px" }}>{s.n} · {s.title}</h3>
                      <span className="text-[12px]" style={{ color: "#8A8073", lineHeight: 1.4 }}>{s.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Conceptos ── */}
            <section className="mt-14 md:mt-[72px]">
              <Eyebrow>Las piezas</Eyebrow>
              <h2 className="text-[22px] md:text-[30px]" style={h2Style}>Un vocabulario común para todos los centros</h2>
              <p style={sectNote}>La razón por la que el stock de decenas de centros se puede sumar es que todos hablan el mismo idioma.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {CONCEPTS.map((c) => (
                  <div key={c.h} className="p-[18px]" style={{ background: "#fff", border: "1px solid #EEE6D4", borderRadius: 14 }}>
                    <h3 className="text-[15px]" style={{ fontWeight: 700, margin: "0 0 5px" }}>{c.h}</h3>
                    <p className="text-[13.5px]" style={{ color: "#6E6557", lineHeight: 1.55, margin: 0 }}>{c.p}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Trazabilidad ── */}
            <section className="mt-14 md:mt-[72px]">
              <Eyebrow>Trazabilidad</Eyebrow>
              <h2 className="text-[22px] md:text-[30px]" style={h2Style}>Cada pieza deja rastro</h2>
              <p style={sectNote}>Las cajas, tarimas y envíos avanzan por estados en un solo sentido, y cada cambio queda registrado. Así siempre se sabe dónde está cada cosa.</p>
              <div className="mt-6 p-[18px] md:p-6" style={{ background: "#fff", border: "1px solid #EEE6D4", borderRadius: 16 }}>
                {TRACKS.map((t, ti) => (
                  <div key={t.name} className="grid grid-cols-1 md:grid-cols-[110px_1fr] gap-2 md:gap-4 md:items-center py-3.5" style={{ borderTop: ti === 0 ? "none" : "1px solid #EEE6D4" }}>
                    <span style={{ fontFamily: "var(--font-source-serif)", fontSize: 17, fontWeight: 600 }}>{t.name}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {t.steps.map((st, si) => (
                        <span key={st} className="flex items-center gap-2">
                          <span className="text-[11.5px]" style={{ fontFamily: "monospace", fontWeight: 600, padding: "5px 10px", borderRadius: 7, border: "1px solid " + (si === 2 ? "#B8D8C6" : si === 1 ? "#B7D1E4" : "#D8CBAC"), background: si === 2 ? "#EAF5EF" : si === 1 ? "#EBF3F9" : "#F6EFDF", color: si === 2 ? "#2E7D5B" : si === 1 ? "#1F5E8C" : "#2B2723" }}>{st}</span>
                          {si < t.steps.length - 1 && <span style={{ color: "#8A8073", fontSize: 13 }}>→</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Reglas ── */}
            <section className="mt-14 md:mt-[72px]">
              <Eyebrow>Control de calidad</Eyebrow>
              <h2 className="text-[22px] md:text-[30px]" style={h2Style}>Reglas que el sistema aplica solo</h2>
              <p style={sectNote}>Araguaney valida cada donación al registrarla, para que no se prepare ni se envíe lo que no debería.</p>
              <div className="mt-4">
                {RULES.map((r, ri) => (
                  <div key={r.n} className="flex gap-3.5 py-[15px]" style={{ borderTop: ri === 0 ? "none" : "1px solid #EEE6D4" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#946A00", flex: "none", paddingTop: 1 }}>{r.n}</span>
                    <div>
                      <h3 className="text-[14.5px]" style={{ fontWeight: 700, margin: "0 0 3px" }}>{r.h}</h3>
                      <p className="text-[13.5px]" style={{ color: "#6E6557", lineHeight: 1.55, margin: 0 }}>{r.p}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Estándares ── */}
            <section className="mt-14 md:mt-[72px]">
              <Eyebrow>Respaldo</Eyebrow>
              <h2 className="text-[22px] md:text-[30px]" style={h2Style}>Estándares que respaldamos</h2>
              <p style={sectNote}>La calidad y la trazabilidad no las inventamos: se apoyan en estándares abiertos y reconocidos.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-6">
                {STANDARDS.map((s) => (
                  <div key={s.a} className="flex gap-3.5 items-baseline p-[14px]" style={{ background: "#fff", border: "1px solid #EEE6D4", borderRadius: 12 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#1F5E8C", flex: "none", minWidth: 62 }}>{s.a}</span>
                    <p className="text-[13px]" style={{ color: "#6E6557", lineHeight: 1.5, margin: 0 }}>{s.p}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── CTA ── */}
            <div className="mt-14 md:mt-[72px] p-7 md:p-11 text-center" style={{ background: "#fff", border: "1px solid #EEE6D4", borderRadius: 18 }}>
              <h2 className="text-[22px] md:text-[30px] mb-2.5" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, textWrap: "balance", margin: "0 0 10px" }}>
                ¿Coordinas un centro de acopio?
              </h2>
              <p className="text-[15px]" style={{ color: "#5C5347", maxWidth: "48ch", margin: "0 auto 20px", lineHeight: 1.55 }}>
                Suma tu centro al estándar común y prepara envíos que lleguen ordenados, cumpliendo el régimen humanitario.
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <CtaLink
                  href="/login"
                  ctaLabel="como_funciona_final"
                  className="inline-flex items-center justify-center px-[26px] py-[13px]"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 700, fontSize: 14.5, borderRadius: 999 }}
                >
                  Empezar ahora
                </CtaLink>
                <Link
                  href="/centro-de-acopio"
                  className="inline-flex items-center justify-center px-[26px] py-[13px]"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 700, fontSize: 14.5, borderRadius: 999 }}
                >
                  Ver el estándar completo
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
