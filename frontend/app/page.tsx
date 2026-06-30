import Image from "next/image"
import Link from "next/link"

const LOGO = "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782786229/araguaney_hwthy5.png"

const NAV_LINKS = [
  { href: "/", label: "Inicio", active: true },
  { href: "/por-que-araguaney", label: "Por qué Araguaney" },
  { href: "/estandares", label: "Estándares" },
  { href: "/contacto", label: "Contacto" },
]

export default function HomePage() {
  return (
    <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Nav */}
      <nav style={{ background: "#FBF7EE", borderBottom: "1px solid #EFE7D6" }}
        className="flex items-center justify-between px-5 md:px-[46px] py-[14px] md:py-5">
        <Link href="/" className="flex items-center gap-[9px] md:gap-[11px]">
          <span style={{ borderRadius: "50%", border: "1px solid #EADFC4" }}
            className="w-8 h-8 md:w-[38px] md:h-[38px] flex items-center justify-center overflow-hidden bg-white flex-none">
            <Image src={LOGO} alt="Araguaney" width={34} height={34} className="object-contain" />
          </span>
          <span style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723" }}
            className="text-[18px] md:text-[21px]">
            Araguaney
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-[30px]">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              style={{ fontSize: 14, fontWeight: l.active ? 600 : 400, color: l.active ? "#2B2723" : "#52493D" }}>
              {l.label}
            </Link>
          ))}
          <Link href="/login"
            style={{ border: "1.5px solid #1F5E8C", color: "#1F5E8C", borderRadius: 99, fontSize: 13.5, fontWeight: 600 }}
            className="px-[18px] py-[9px] inline-flex items-center">
            Iniciar sesión
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-1 flex flex-col gap-[5px]" aria-label="Menú">
          <span style={{ width: 20, height: 2, background: "#2B2723", borderRadius: 2, display: "block" }} />
          <span style={{ width: 20, height: 2, background: "#2B2723", borderRadius: 2, display: "block" }} />
          <span style={{ width: 13, height: 2, background: "#2B2723", borderRadius: 2, display: "block" }} />
        </button>
      </nav>

      {/* Hero */}
      <div className="grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] items-center
                      px-5 md:px-[46px] pt-[18px] md:pt-[62px] pb-8 md:pb-[56px] gap-0 md:gap-[30px]">

        {/* Left: copy */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B07D00", fontWeight: 700, marginBottom: 16 }}
            className="text-[10.5px] md:text-[12px]">
            <span style={{ height: 1.5, background: "#E0A100" }} className="w-[18px] md:w-[24px]" />
            <span className="hidden md:inline">Coordinación de centros de acopio</span>
            <span className="md:hidden">Centros de acopio</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-source-serif)", margin: "0 0 16px", fontWeight: 600, letterSpacing: "-0.3px", lineHeight: 1.08 }}
            className="text-[33px] md:text-[54px] md:mb-[24px]">
            Que cada donación llegue ordenada.
          </h1>
          <p style={{ margin: 0, lineHeight: 1.55, color: "#5C5347" }} className="text-[14.5px] md:text-[17px]">
            <span className="md:hidden">Un mismo estándar para registrar, empacar en cajas homogéneas con QR y enviar con manifiesto.</span>
            <span className="hidden md:inline max-w-[480px] block">Araguaney conecta a los centros de acopio en un mismo estándar: registra los insumos a nivel de ítem, los empaca en cajas homogéneas con QR y los consolida en envíos con manifiesto exportable.</span>
          </p>

          {/* CTAs — column on mobile, row on desktop */}
          <div className="flex flex-col md:flex-row gap-[10px] md:gap-[13px] mt-[22px] md:mt-8">
            <Link href="/login"
              style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 15, boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)", borderRadius: 99 }}
              className="flex items-center justify-center px-[26px] py-[14px]">
              Iniciar sesión
            </Link>
            <Link href="/por-que-araguaney"
              style={{ background: "#fff", border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 15, borderRadius: 99 }}
              className="flex items-center justify-center px-6 py-[14px]">
              Por qué Araguaney
            </Link>
          </div>

          {/* Standards strip */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #EAE1CF" }}
            className="md:mt-[38px] md:pt-[22px]">
            <div style={{ letterSpacing: "0.1em", textTransform: "uppercase", color: "#9A9081", marginBottom: 8, fontWeight: 700 }}
              className="text-[10px] md:text-[11px]">
              <span className="md:hidden">Estándares globales</span>
              <span className="hidden md:inline">Construido sobre estándares globales</span>
            </div>
            <div className="flex flex-wrap gap-x-[9px] gap-y-1" style={{ fontSize: 13, color: "#52493D", fontWeight: 600 }}>
              {["WHO", "IFRC/ICRC", "IOM", "UNSPSC", "GS1"].map((s, i, arr) => (
                <span key={s} className="flex items-center gap-[9px]">
                  {s}{i < arr.length - 1 && <span style={{ color: "#D8C9A6" }}>·</span>}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: illustration */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
          className="mt-[26px] md:mt-0 min-h-[200px] md:min-h-[360px]">
          <div style={{ position: "absolute", borderRadius: "50%", background: "radial-gradient(circle at 50% 45%, #FCEFC2 0%, #FBF7EE 70%)" }}
            className="w-[230px] h-[230px] md:w-[380px] md:h-[380px]" />
          <Image src={LOGO} alt="Araguaney" width={400} height={400}
            style={{ position: "relative", filter: "drop-shadow(0 16px 26px rgba(176,125,0,.22))" }}
            className="w-[240px] md:w-[400px] max-w-full" />
        </div>
      </div>

      {/* Steps */}
      <div style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}
        className="px-5 md:px-[46px] py-7 md:py-[54px]">
        <div className="flex items-baseline justify-between mb-5 md:mb-8">
          <h2 style={{ fontFamily: "var(--font-source-serif)", margin: 0, fontWeight: 600 }}
            className="text-[22px] md:text-[30px]">
            Del acopio al envío<span className="hidden md:inline">, en orden</span>
          </h2>
          <span style={{ fontSize: 13.5, color: "#8A8073" }} className="hidden md:inline">
            Tres pasos, un mismo lenguaje entre centros
          </span>
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-3 gap-5">
          {[
            { n: "01", title: "Registrar", desc: "Cada donación en especie se captura a nivel de ítem con su categoría, lote y caducidad." },
            { n: "02", title: "Empacar", desc: "Cajas homogéneas —un solo producto, lote y caducidad— selladas con su QR y etiqueta." },
            { n: "03", title: "Enviar", desc: "Las cajas se consolidan en tarimas y envíos con manifiesto exportable, listo para aduana." },
          ].map((s) => (
            <div key={s.n} style={{ padding: 26, border: "1px solid #EEE6D4", borderRadius: 14, background: "#FCFAF4" }}>
              <div style={{ fontFamily: "var(--font-source-serif)", fontSize: 26, color: "#E0A100", fontWeight: 600 }}>{s.n}</div>
              <h3 style={{ fontFamily: "var(--font-source-serif)", margin: "14px 0 8px", fontSize: 19, fontWeight: 600 }}>{s.title}</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#6E6557" }}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Mobile list */}
        <div className="flex flex-col gap-3 md:hidden">
          {[
            { n: "01", title: "Registrar", desc: "Cada ítem con categoría, lote y caducidad." },
            { n: "02", title: "Empacar", desc: "Cajas homogéneas selladas con QR." },
            { n: "03", title: "Enviar", desc: "Tarimas y envíos con manifiesto." },
          ].map((s) => (
            <div key={s.n} className="flex gap-[13px] items-start">
              <span style={{ fontFamily: "var(--font-source-serif)", fontSize: 20, color: "#E0A100", fontWeight: 600, flexShrink: 0 }}>{s.n}</span>
              <div>
                <div style={{ fontFamily: "var(--font-source-serif)", fontSize: 16, fontWeight: 600 }}>{s.title}</div>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "#6E6557", lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#2B2723", color: "#E9E2D5" }}
        className="px-5 md:px-[46px] py-6 md:py-10 flex items-start md:items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff" }}
            className="flex items-center justify-center overflow-hidden flex-none">
            <Image src={LOGO} alt="Araguaney" width={34} height={34} className="object-contain" />
          </span>
          <div>
            <div style={{ fontFamily: "var(--font-source-serif)", fontSize: 18, fontWeight: 600, color: "#fff" }}>Araguaney</div>
            <div style={{ fontSize: 12, color: "#A89E8C", marginTop: 2 }} className="hidden md:block">El estándar común para centros de acopio</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#A89E8C", lineHeight: 1.55 }}>
          Sin datos personales de donantes ni beneficiarios. Solo inventario, trazable de la caja al envío.
        </div>
      </footer>
    </div>
  )
}
