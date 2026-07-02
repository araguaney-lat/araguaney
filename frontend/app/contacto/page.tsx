import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import ContactForm from "@/components/ContactForm"

const LOGO = "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contáctanos para sumar tu centro de acopio a la coordinación nacional de ayuda humanitaria.",
  alternates: { canonical: "/contacto" },
}

export default function ContactoPage() {
  return (
    <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Nav */}
      <nav style={{ background: "#FBF7EE", borderBottom: "1px solid #EFE7D6" }}
        className="flex items-center justify-between px-5 md:px-[46px] py-[14px] md:py-5">
        <Link href="/" className="flex items-center gap-[9px] md:gap-[11px]">
          <span style={{ borderRadius: "50%", border: "1px solid #EADFC4" }}
            className="w-8 h-8 md:w-[38px] md:h-[38px] flex items-center justify-center overflow-hidden bg-white flex-none">
            <Image src={LOGO} alt="" width={34} height={34} className="object-contain" />
          </span>
          <span style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723" }}
            className="text-[18px] md:text-[21px]">Araguaney</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-[30px]">
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

        {/* Mobile hamburger */}
        <button className="md:hidden p-1 flex flex-col gap-[5px]" aria-label="Menú">
          <span style={{ width: 20, height: 2, background: "#2B2723", borderRadius: 2, display: "block" }} />
          <span style={{ width: 20, height: 2, background: "#2B2723", borderRadius: 2, display: "block" }} />
          <span style={{ width: 13, height: 2, background: "#2B2723", borderRadius: 2, display: "block" }} />
        </button>
      </nav>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr]">

        {/* Left: info */}
        <div className="px-5 md:px-[46px] py-7 md:py-[56px]">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#946A00", fontWeight: 700, marginBottom: 14 }}
            className="md:text-[12px] md:mb-[18px]">
            <span style={{ width: 18, height: 1.5, background: "#906400" }} className="md:w-6" />
            Hablemos
          </div>
          <h1 style={{ fontFamily: "var(--font-source-serif)", margin: "0 0 14px", fontWeight: 600, letterSpacing: "-0.3px", lineHeight: 1.1 }}
            className="text-[27px] md:text-[40px] md:mb-[20px]">
            ¿Tu fundación coordina un centro<span className="hidden md:inline"> de acopio</span>?
          </h1>
          <p style={{ margin: "0 0 28px", lineHeight: 1.6, color: "#5C5347" }}
            className="text-[14px] md:text-[16px] md:mb-0">
            Súmate a la red. Te ayudamos a dar de alta tu centro y a estandarizar tu inventario con el resto.
          </p>

          {/* Contact info — desktop only */}
          <div className="hidden md:flex flex-col gap-[18px] mt-9">
            {[
              { bg: "#FBEFC9", c: "#946A00", title: "Correo", val: "hola@araguaney.lat" },
              { bg: "#E9F1F8", c: "#1F5E8C", title: "Alta de centro", val: "Respuesta en menos de 48 horas hábiles" },
              { bg: "#FBEFC9", c: "#946A00", title: "Centros activos", val: "Operando en México · destino Venezuela" },
            ].map((item) => (
              <div key={item.title} className="flex gap-[14px] items-start">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: item.bg, border: `2px solid ${item.c}`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#2B2723" }}>{item.title}</div>
                  <div style={{ fontSize: 14.5, color: "#5C5347", marginTop: 2 }}>{item.val}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: "14px 16px", background: "#F6F8FB", border: "1px solid #E3EDF5", borderRadius: 12, fontSize: 13, lineHeight: 1.55, color: "#3F576B" }}
            className="md:mt-[34px]">
            <strong style={{ color: "#1F5E8C" }}>Privacidad.</strong> No recopilamos datos personales de donantes ni beneficiarios. Este formulario solo nos sirve para contactar a tu organización.
          </div>
        </div>

        {/* Right: form */}
        <div style={{ background: "#fff" }}
          className="px-5 md:px-[50px] py-7 md:py-[56px] md:border-l md:border-[#EFE7D6]">
          <ContactForm />
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#2B2723", color: "#A89E8C" }}
        className="px-5 md:px-[46px] py-6 md:py-[26px] flex justify-between flex-wrap gap-3 text-[12.5px]">
        <span style={{ fontFamily: "var(--font-source-serif)", fontSize: 16, color: "#fff", fontWeight: 600 }}>Araguaney</span>
        <span>El estándar común · México → Venezuela</span>
      </footer>
    </div>
  )
}
