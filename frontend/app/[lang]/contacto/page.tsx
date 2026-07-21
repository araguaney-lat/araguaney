import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import ContactForm, { type ContactFormLabels } from "@/components/ContactForm"
import { alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"

const KEY = "contacto"

const LOGO = "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"

interface InfoItem {
  title: string
  val: string
}
interface Content {
  metaTitle: string
  description: string
  navHome: string
  navWhy: string
  navStandards: string
  navContact: string
  navLogin: string
  menuAria: string
  eyebrow: string
  h1a: string
  h1Md: string
  h1End: string
  lead: string
  info: InfoItem[]
  privacyLabel: string
  privacyText: string
  footerPrivacy: string
  footerTerms: string
  form: ContactFormLabels
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Contacto",
    description:
      "Contáctanos para sumar tu centro de acopio a la coordinación nacional de ayuda humanitaria.",
    navHome: "Inicio",
    navWhy: "Por qué Araguaney",
    navStandards: "Estándares",
    navContact: "Contacto",
    navLogin: "Iniciar sesión",
    menuAria: "Menú",
    eyebrow: "Hablemos",
    h1a: "¿Tu fundación coordina un centro",
    h1Md: " de acopio",
    h1End: "?",
    lead: "Súmate a la red. Te ayudamos a dar de alta tu centro y a estandarizar tu inventario con el resto.",
    info: [
      { title: "Correo", val: "hola@araguaney.lat" },
      { title: "Alta de centro", val: "Respuesta en menos de 48 horas hábiles" },
      { title: "Centros activos", val: "Operando en México · múltiples destinos" },
    ],
    privacyLabel: "Privacidad.",
    privacyText:
      " No recopilamos datos personales de donantes ni beneficiarios. Este formulario solo nos sirve para contactar a tu organización.",
    footerPrivacy: "Aviso de Privacidad",
    footerTerms: "Términos",
    form: {
      name: "Nombre",
      namePlaceholder: "Tu nombre",
      org: "Organización",
      orgPlaceholder: "Tu fundación",
      email: "Correo",
      emailPlaceholder: "tu@correo.org",
      helpTitle: "¿Cómo podemos ayudarte?",
      typeAlta: "Dar de alta un centro",
      typeVoluntario: "Sumarme como voluntario",
      typeConsulta: "Otra consulta",
      message: "Mensaje",
      messagePlaceholder: "Cuéntanos sobre tu centro.",
      submit: "Enviar mensaje",
      submitting: "Enviando…",
      turnstileError: "Completa la verificación de seguridad.",
      successTitle: "Mensaje enviado",
      successBody: "Nos pondremos en contacto contigo en menos de 48 horas hábiles.",
    },
  },
  en: {
    metaTitle: "Contact",
    description:
      "Get in touch to add your collection center to the national humanitarian aid coordination.",
    navHome: "Home",
    navWhy: "Why Araguaney",
    navStandards: "Standards",
    navContact: "Contact",
    navLogin: "Sign in",
    menuAria: "Menu",
    eyebrow: "Let's talk",
    h1a: "Does your foundation run a collection",
    h1Md: " center",
    h1End: "?",
    lead: "Join the network. We'll help you register your center and standardize your inventory with everyone else.",
    info: [
      { title: "Email", val: "hola@araguaney.lat" },
      { title: "Center onboarding", val: "Reply within 48 business hours" },
      { title: "Active centers", val: "Operating in Mexico · multiple destinations" },
    ],
    privacyLabel: "Privacy.",
    privacyText:
      " We don't collect personal data of donors or beneficiaries. This form only lets us contact your organization.",
    footerPrivacy: "Privacy Notice",
    footerTerms: "Terms",
    form: {
      name: "Name",
      namePlaceholder: "Your name",
      org: "Organization",
      orgPlaceholder: "Your organization",
      email: "Email",
      emailPlaceholder: "you@email.org",
      helpTitle: "How can we help?",
      typeAlta: "Register a center",
      typeVoluntario: "Join as a volunteer",
      typeConsulta: "Another question",
      message: "Message",
      messagePlaceholder: "Tell us about your center.",
      submit: "Send message",
      submitting: "Sending…",
      turnstileError: "Please complete the security check.",
      successTitle: "Message sent",
      successBody: "We'll get back to you within 48 business hours.",
    },
  },
}

// Static per-item styling (colors are presentation, not translatable content).
const INFO_STYLES = [
  { bg: "#FBEFC9", c: "#946A00" },
  { bg: "#E9F1F8", c: "#1F5E8C" },
  { bg: "#FBEFC9", c: "#946A00" },
] as const

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
  const { lang } = await params
  const c = CONTENT[lang]
  return {
    title: c.metaTitle,
    description: c.description,
    alternates: alternates(KEY, lang),
  }
}

export default async function ContactoPage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang: locale } = await params
  const c = CONTENT[locale]

  const home = localizedPath("", locale)
  const navLinks = [
    { href: home, label: c.navHome },
    { href: `${home}#por-que`, label: c.navWhy },
    { href: `${home}#estandares`, label: c.navStandards },
    { href: localizedPath(KEY, locale), label: c.navContact, active: true },
  ]

  return (
    <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Nav */}
      <nav style={{ background: "#FBF7EE", borderBottom: "1px solid #EFE7D6" }}
        className="flex items-center justify-between px-5 md:px-[46px] py-[14px] md:py-5">
        <Link href={home} className="flex items-center gap-[9px] md:gap-[11px]">
          <span style={{ borderRadius: "50%", border: "1px solid #EADFC4" }}
            className="w-8 h-8 md:w-[38px] md:h-[38px] flex items-center justify-center overflow-hidden bg-white flex-none">
            <Image src={LOGO} alt="" width={34} height={34} className="object-contain" />
          </span>
          <span style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723" }}
            className="text-[18px] md:text-[21px]">Araguaney</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-[30px]">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}
              style={{ fontSize: 14, fontWeight: l.active ? 600 : 400, color: l.active ? "#2B2723" : "#52493D" }}>
              {l.label}
            </Link>
          ))}
          <Link href="/login"
            style={{ border: "1.5px solid #1F5E8C", color: "#1F5E8C", borderRadius: 99, fontSize: 13.5, fontWeight: 600 }}
            className="px-[18px] py-[9px] inline-flex items-center">
            {c.navLogin}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-1 flex flex-col gap-[5px]" aria-label={c.menuAria}>
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
            {c.eyebrow}
          </div>
          <h1 style={{ fontFamily: "var(--font-source-serif)", margin: "0 0 14px", fontWeight: 600, letterSpacing: "-0.3px", lineHeight: 1.1 }}
            className="text-[27px] md:text-[40px] md:mb-[20px]">
            {c.h1a}<span className="hidden md:inline">{c.h1Md}</span>{c.h1End}
          </h1>
          <p style={{ margin: "0 0 28px", lineHeight: 1.6, color: "#5C5347" }}
            className="text-[14px] md:text-[16px] md:mb-0">
            {c.lead}
          </p>

          {/* Contact info — desktop only */}
          <div className="hidden md:flex flex-col gap-[18px] mt-9">
            {c.info.map((item, i) => {
              const s = INFO_STYLES[i]
              return (
                <div key={item.title} className="flex gap-[14px] items-start">
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, border: `2px solid ${s.c}`, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#2B2723" }}>{item.title}</div>
                    <div style={{ fontSize: 14.5, color: "#5C5347", marginTop: 2 }}>{item.val}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ padding: "14px 16px", background: "#F6F8FB", border: "1px solid #E3EDF5", borderRadius: 12, fontSize: 13, lineHeight: 1.55, color: "#3F576B" }}
            className="md:mt-[34px]">
            <strong style={{ color: "#1F5E8C" }}>{c.privacyLabel}</strong>{c.privacyText}
          </div>
        </div>

        {/* Right: form */}
        <div style={{ background: "#fff" }}
          className="px-5 md:px-[50px] py-7 md:py-[56px] md:border-l md:border-[#EFE7D6]">
          <ContactForm labels={c.form} />
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#2B2723", color: "#A89E8C" }}
        className="px-5 md:px-[46px] py-6 md:py-[26px] flex justify-between flex-wrap gap-3 text-[12.5px]">
        <span style={{ fontFamily: "var(--font-source-serif)", fontSize: 16, color: "#fff", fontWeight: 600 }}>Araguaney</span>
        <span className="flex items-center gap-4">
          <Link href={localizedPath("aviso-de-privacidad", locale)} style={{ color: "#E9E2D5", fontWeight: 600 }}>{c.footerPrivacy}</Link>
          <span>·</span>
          <Link href={localizedPath("terminos", locale)} style={{ color: "#E9E2D5", fontWeight: 600 }}>{c.footerTerms}</Link>
        </span>
      </footer>
    </div>
  )
}
