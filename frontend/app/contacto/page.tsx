import Image from "next/image"
import Link from "next/link"

const LOGO = "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782786229/araguaney_hwthy5.png"

export default function ContactoPage() {
  return (
    <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ background: "#FBF7EE", borderBottom: "1px solid #EFE7D6" }}
        className="flex items-center justify-between px-[46px] py-5">
        <Link href="/" className="flex items-center gap-[11px]">
          <span style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid #EADFC4" }}
            className="flex items-center justify-center overflow-hidden bg-white flex-none">
            <Image src={LOGO} alt="Araguaney" width={34} height={34} className="object-contain" />
          </span>
          <span style={{ fontFamily: "var(--font-source-serif)", fontSize: 21, fontWeight: 600, color: "#2B2723" }}>Araguaney</span>
        </Link>
        <div className="flex items-center gap-[30px]">
          {[
            { href: "/", label: "Inicio" },
            { href: "/por-que-araguaney", label: "Por qué Araguaney" },
            { href: "/estandares", label: "Estándares" },
            { href: "/contacto", label: "Contacto", active: true },
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

      {/* Content split */}
      <div style={{ display: "grid", gridTemplateColumns: ".9fr 1.1fr", flex: 1 }}>
        {/* Left info */}
        <div style={{ padding: "56px 46px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#B07D00", fontWeight: 700, marginBottom: 18 }}>
            <span style={{ width: 24, height: 1.5, background: "#E0A100" }} />
            Hablemos
          </div>
          <h1 style={{ fontFamily: "var(--font-source-serif)", margin: "0 0 20px", fontSize: 40, lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.3px" }}>
            ¿Tu fundación coordina un centro de acopio?
          </h1>
          <p style={{ margin: "0 0 36px", fontSize: 16, lineHeight: 1.6, color: "#5C5347", maxWidth: 400 }}>
            Súmate a la red. Te ayudamos a dar de alta tu centro y a estandarizar tu inventario con el resto.
          </p>
          <div className="flex flex-col gap-[18px]">
            {[
              { bg: "#FBEFC9", color: "#B07D00", title: "Correo", val: "hola@araguaney.org" },
              { bg: "#E9F1F8", color: "#1F5E8C", title: "Alta de centro", val: "Respuesta en menos de 48 horas hábiles" },
              { bg: "#FBEFC9", color: "#B07D00", title: "Centros activos", val: "Operando en México · destino Venezuela" },
            ].map((item) => (
              <div key={item.title} className="flex gap-[14px] items-start">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: item.bg, border: `2px solid ${item.color}`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#2B2723" }}>{item.title}</div>
                  <div style={{ fontSize: 14.5, color: "#5C5347", marginTop: 2 }}>{item.val}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 34, padding: "16px 18px", background: "#F6F8FB", border: "1px solid #E3EDF5", borderRadius: 12, fontSize: 13, lineHeight: 1.55, color: "#3F576B" }}>
            <strong style={{ color: "#1F5E8C" }}>Privacidad.</strong> No recopilamos datos personales de donantes ni beneficiarios. Este formulario solo nos sirve para contactar a tu organización.
          </div>
        </div>

        {/* Right form */}
        <div style={{ background: "#fff", borderLeft: "1px solid #EFE7D6", padding: "56px 50px" }}>
          <form className="max-w-[440px]">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              {[{ label: "Nombre", placeholder: "Tu nombre" }, { label: "Organización / Fundación", placeholder: "Nombre de tu fundación" }].map((f) => (
                <div key={f.label}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#52493D", marginBottom: 7 }}>{f.label}</label>
                  <input placeholder={f.placeholder} style={{ width: "100%", height: 46, background: "#FCFAF4", border: "1.5px solid #E6DCC8", borderRadius: 10, padding: "0 14px", fontSize: 14, color: "#2B2723", outline: "none" }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#52493D", marginBottom: 7 }}>Correo electrónico</label>
              <input type="email" placeholder="tu@correo.org" style={{ width: "100%", height: 46, background: "#FCFAF4", border: "1.5px solid #E6DCC8", borderRadius: 10, padding: "0 14px", fontSize: 14, color: "#2B2723", outline: "none" }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#52493D", marginBottom: 7 }}>¿Cómo podemos ayudarte?</label>
              <div className="flex gap-2 flex-wrap">
                {["Dar de alta un centro", "Sumarme como voluntario", "Otra consulta"].map((opt, i) => (
                  <span key={opt} style={{ fontSize: 13, padding: "8px 14px", borderRadius: 99, fontWeight: 600, cursor: "pointer", background: i === 0 ? "#1F5E8C" : "#FCFAF4", color: i === 0 ? "#fff" : "#52493D", border: i === 0 ? "none" : "1.5px solid #E6DCC8" }}>
                    {opt}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#52493D", marginBottom: 7 }}>Mensaje</label>
              <textarea placeholder="Cuéntanos sobre tu centro: ubicación, capacidad y qué tipo de insumos manejan." rows={5}
                style={{ width: "100%", background: "#FCFAF4", border: "1.5px solid #E6DCC8", borderRadius: 10, padding: "13px 14px", fontSize: 14, color: "#2B2723", lineHeight: 1.5, outline: "none", resize: "vertical" }} />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <button type="submit"
                style={{ flex: 1, minWidth: 180, height: 50, background: "#1F5E8C", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", boxShadow: "0 14px 26px -12px rgba(31,94,140,.7)" }}>
                Enviar mensaje
              </button>
              <div className="flex items-center gap-2" style={{ fontSize: 11, color: "#A89E8C" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1F7A4D" }} />
                Protegido con Turnstile
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#2B2723", color: "#A89E8C" }}
        className="px-[46px] py-[26px] flex justify-between flex-wrap gap-3 text-[12.5px]">
        <span style={{ fontFamily: "var(--font-source-serif)", fontSize: 16, color: "#fff", fontWeight: 600 }}>Araguaney</span>
        <span>El estándar común para centros de acopio · México → Venezuela</span>
      </footer>
    </div>
  )
}
