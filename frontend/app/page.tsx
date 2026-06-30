import Image from "next/image"
import Link from "next/link"

const LOGO = "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782786229/araguaney_hwthy5.png"

function PublicNav() {
  return (
    <nav style={{ background: "#FBF7EE", borderBottom: "1px solid #EFE7D6" }}
      className="flex items-center justify-between px-[46px] py-5">
      <Link href="/" className="flex items-center gap-[11px]">
        <span style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid #EADFC4" }}
          className="flex items-center justify-center overflow-hidden bg-white flex-none">
          <Image src={LOGO} alt="Araguaney" width={34} height={34} className="object-contain" />
        </span>
        <span style={{ fontFamily: "var(--font-source-serif)", fontSize: 21, fontWeight: 600, color: "#2B2723" }}>
          Araguaney
        </span>
      </Link>
      <div className="flex items-center gap-[30px]">
        {[
          { href: "/", label: "Inicio", active: true },
          { href: "/por-que-araguaney", label: "Por qué Araguaney" },
          { href: "/estandares", label: "Estándares" },
          { href: "/contacto", label: "Contacto" },
        ].map((l) => (
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
    </nav>
  )
}

export default function HomePage() {
  return (
    <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicNav />

      {/* Hero */}
      <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 30, alignItems: "center", padding: "62px 46px 56px" }}>
        <div>
          {/* Eyebrow */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#B07D00", fontWeight: 700, marginBottom: 22 }}>
            <span style={{ width: 24, height: 1.5, background: "#E0A100" }} />
            Coordinación de centros de acopio
          </div>
          <h1 style={{ fontFamily: "var(--font-source-serif)", margin: "0 0 24px", fontSize: 54, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.5px" }}>
            Que cada donación llegue ordenada.
          </h1>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "#5C5347", maxWidth: 480 }}>
            Araguaney conecta a los centros de acopio en un mismo estándar: registra los insumos a nivel de ítem, los empaca en cajas homogéneas con QR y los consolida en envíos con manifiesto exportable.
          </p>
          <div className="flex gap-[13px] mt-8">
            <Link href="/login"
              style={{ background: "#1F5E8C", color: "#fff", borderRadius: 99, fontWeight: 600, fontSize: 15, boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)" }}
              className="inline-flex items-center gap-2 px-[26px] py-[14px]">
              Iniciar sesión
            </Link>
            <Link href="/por-que-araguaney"
              style={{ background: "#fff", border: "1.5px solid #E6D4A6", color: "#2B2723", borderRadius: 99, fontWeight: 600, fontSize: 15 }}
              className="inline-flex items-center gap-2 px-6 py-[14px]">
              Por qué Araguaney
            </Link>
          </div>
          {/* Standards strip */}
          <div style={{ marginTop: 38, paddingTop: 22, borderTop: "1px solid #EAE1CF" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9A9081", marginBottom: 9, fontWeight: 600 }}>
              Construido sobre estándares globales
            </div>
            <div className="flex flex-wrap gap-x-[10px] gap-y-1"
              style={{ fontSize: 13.5, color: "#52493D", fontWeight: 600 }}>
              {["WHO", "IFRC / ICRC", "IOM", "UNSPSC", "GS1"].map((s, i, arr) => (
                <span key={s} className="flex items-center gap-[10px]">
                  {s}
                  {i < arr.length - 1 && <span style={{ color: "#D8C9A6" }}>·</span>}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Illustration */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 360 }}>
          <div style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle at 50% 45%, #FCEFC2 0%, #FBF7EE 70%)" }} />
          <Image
            src={LOGO}
            alt="Araguaney"
            width={400}
            height={400}
            style={{ position: "relative", filter: "drop-shadow(0 24px 40px rgba(176,125,0,.22))" }}
            className="max-w-full"
          />
        </div>
      </div>

      {/* Cómo funciona */}
      <div style={{ background: "#fff", padding: "54px 46px", borderTop: "1px solid #EFE7D6" }}>
        <div className="flex items-baseline justify-between mb-8">
          <h2 style={{ fontFamily: "var(--font-source-serif)", margin: 0, fontSize: 30, fontWeight: 600 }}>
            Del acopio al envío, en orden
          </h2>
          <span style={{ fontSize: 13.5, color: "#8A8073" }}>Tres pasos, un mismo lenguaje entre centros</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {[
            { n: "01", title: "Registrar", desc: "Cada donación en especie se captura a nivel de ítem con su categoría, lote y caducidad." },
            { n: "02", title: "Empacar", desc: "Cajas homogéneas —un solo producto, lote y caducidad— selladas con su QR y etiqueta." },
            { n: "03", title: "Enviar", desc: "Las cajas se consolidan en tarimas y envíos con manifiesto exportable, listo para aduana." },
          ].map((step) => (
            <div key={step.n} style={{ padding: 26, border: "1px solid #EEE6D4", borderRadius: 14, background: "#FCFAF4" }}>
              <div style={{ fontFamily: "var(--font-source-serif)", fontSize: 26, color: "#E0A100", fontWeight: 600 }}>{step.n}</div>
              <h3 style={{ fontFamily: "var(--font-source-serif)", margin: "14px 0 8px", fontSize: 19, fontWeight: 600 }}>{step.title}</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#6E6557" }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#2B2723", color: "#E9E2D5" }}
        className="px-[46px] py-10 flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff" }}
            className="flex items-center justify-center overflow-hidden flex-none">
            <Image src={LOGO} alt="Araguaney" width={34} height={34} className="object-contain" />
          </span>
          <div>
            <div style={{ fontFamily: "var(--font-source-serif)", fontSize: 18, fontWeight: 600, color: "#fff" }}>Araguaney</div>
            <div style={{ fontSize: 12.5, color: "#A89E8C", marginTop: 2 }}>El estándar común para centros de acopio</div>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: "#A89E8C", maxWidth: 340, textAlign: "right" }}>
          Sin datos personales de donantes ni beneficiarios. Solo inventario, trazable de la caja al envío.
        </div>
      </footer>
    </div>
  )
}
