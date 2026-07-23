import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import CenterApplicationForm, {
  type CenterApplicationFormLabels,
  type CenterCountryOption,
} from "@/components/CenterApplicationForm"
import { getDictionary } from "@/lib/i18n"
import { alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"

const KEY = "registrar-centro"

// Compact, curated country list for the origin of a collection center. ISO-2
// uppercase codes (what the backend stores); labels are localized per page.
const COUNTRY_CODES = ["MX", "VE", "CO", "US", "ES", "AR", "CL", "PE", "EC", "PA", "DO", "CA"] as const

const COUNTRY_LABELS: Record<Locale, Record<(typeof COUNTRY_CODES)[number], string>> = {
  es: {
    MX: "🇲🇽 México",
    VE: "🇻🇪 Venezuela",
    CO: "🇨🇴 Colombia",
    US: "🇺🇸 Estados Unidos",
    ES: "🇪🇸 España",
    AR: "🇦🇷 Argentina",
    CL: "🇨🇱 Chile",
    PE: "🇵🇪 Perú",
    EC: "🇪🇨 Ecuador",
    PA: "🇵🇦 Panamá",
    DO: "🇩🇴 Rep. Dominicana",
    CA: "🇨🇦 Canadá",
  },
  en: {
    MX: "🇲🇽 Mexico",
    VE: "🇻🇪 Venezuela",
    CO: "🇨🇴 Colombia",
    US: "🇺🇸 United States",
    ES: "🇪🇸 Spain",
    AR: "🇦🇷 Argentina",
    CL: "🇨🇱 Chile",
    PE: "🇵🇪 Peru",
    EC: "🇪🇨 Ecuador",
    PA: "🇵🇦 Panama",
    DO: "🇩🇴 Dominican Rep.",
    CA: "🇨🇦 Canada",
  },
}

interface Content {
  metaTitle: string
  description: string
  eyebrow: string
  h1: string
  lead: string
  privacyLabel: string
  privacyText: string
  form: CenterApplicationFormLabels
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Registra tu centro de acopio",
    description:
      "Solicita el alta de tu centro de acopio en la coordinación nacional de ayuda humanitaria. Sin costo, con estándar común y panel agregado.",
    eyebrow: "Alta de centro",
    h1: "Registra tu centro de acopio",
    lead: "Completa los datos de tu centro y de un contacto responsable. Revisaremos tu solicitud y, al aprobarla, crearemos tu centro y tu acceso de coordinador.",
    privacyLabel: "Privacidad.",
    privacyText:
      " No recopilamos datos de donantes ni beneficiarios. Estos datos solo sirven para dar de alta tu centro y contactar a la persona responsable.",
    form: {
      centerName: "Nombre del centro",
      centerNamePlaceholder: "Centro de Acopio Solidaridad",
      country: "País",
      countryPlaceholder: "Selecciona un país",
      stateName: "Estado / Provincia",
      stateNamePlaceholder: "Ej. Jalisco",
      address: "Dirección",
      addressPlaceholder: "Calle, número, colonia",
      contactName: "Nombre del contacto",
      contactNamePlaceholder: "Tu nombre",
      contactEmail: "Correo del contacto",
      contactEmailPlaceholder: "tu@correo.org",
      contactPhone: "Teléfono",
      contactPhonePlaceholder: "+52 55 1234 5678",
      backingOrg: "Organización que respalda",
      backingOrgPlaceholder: "Fundación o colectivo",
      socialUrl: "Red social o sitio web",
      socialUrlPlaceholder: "https://instagram.com/tu-centro",
      message: "Mensaje",
      messagePlaceholder: "Cuéntanos sobre tu centro y su operación.",
      optional: "opcional",
      submit: "Enviar solicitud",
      submitting: "Enviando…",
      turnstileError: "Completa la verificación de seguridad.",
      successTitle: "Solicitud enviada",
      successBody:
        "Revisa tu correo para confirmar tu solicitud. Después de confirmarla, nuestro equipo la revisará y te avisará cuando tu centro esté activo.",
    },
  },
  en: {
    metaTitle: "Register your collection center",
    description:
      "Apply to add your collection center to the national humanitarian aid coordination. Free, with a common standard and an aggregated dashboard.",
    eyebrow: "Center onboarding",
    h1: "Register your collection center",
    lead: "Fill in your center's details and a responsible contact. We'll review your application and, once approved, create your center and your coordinator access.",
    privacyLabel: "Privacy.",
    privacyText:
      " We don't collect donor or beneficiary data. This information is only used to register your center and to contact the responsible person.",
    form: {
      centerName: "Center name",
      centerNamePlaceholder: "Solidarity Collection Center",
      country: "Country",
      countryPlaceholder: "Select a country",
      stateName: "State / Province",
      stateNamePlaceholder: "e.g. Jalisco",
      address: "Address",
      addressPlaceholder: "Street, number, neighborhood",
      contactName: "Contact name",
      contactNamePlaceholder: "Your name",
      contactEmail: "Contact email",
      contactEmailPlaceholder: "you@email.org",
      contactPhone: "Phone",
      contactPhonePlaceholder: "+52 55 1234 5678",
      backingOrg: "Backing organization",
      backingOrgPlaceholder: "Foundation or collective",
      socialUrl: "Social media or website",
      socialUrlPlaceholder: "https://instagram.com/your-center",
      message: "Message",
      messagePlaceholder: "Tell us about your center and how it operates.",
      optional: "optional",
      submit: "Submit application",
      submitting: "Sending…",
      turnstileError: "Please complete the security check.",
      successTitle: "Application submitted",
      successBody:
        "Check your email to confirm your application. After you confirm it, our team will review it and let you know once your center is active.",
    },
  },
}

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

export default async function RegisterCenterPage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang: locale } = await params
  const c = CONTENT[locale]
  const dict = await getDictionary(locale)

  const countries: CenterCountryOption[] = COUNTRY_CODES.map((code) => ({
    code,
    label: COUNTRY_LABELS[locale][code],
  }))

  return (
    <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <HomeNav
        dict={dict.nav}
        locale={locale}
        localeLinks={{ es: localizedPath(KEY, "es"), en: localizedPath(KEY, "en") }}
      />
      <div className="h-[56px] md:hidden" />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr]">
        {/* Left: intro */}
        <div className="px-5 md:px-[46px] py-7 md:py-[56px]">
          <div
            className="text-[10.5px] md:text-[12px] mb-3 md:mb-[18px]"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "#946A00", fontWeight: 700 }}
          >
            <span style={{ width: 18, height: 1.5, background: "#906400", display: "inline-block" }} className="md:w-6" />
            {c.eyebrow}
          </div>
          <h1
            className="text-[27px] md:text-[40px] mb-3.5 md:mb-5"
            style={{ fontFamily: "var(--font-source-serif)", margin: "0 0 16px", fontWeight: 600, letterSpacing: "-0.3px", lineHeight: 1.1 }}
          >
            {c.h1}
          </h1>
          <p className="text-[14px] md:text-[16px]" style={{ margin: "0 0 28px", lineHeight: 1.6, color: "#5C5347", maxWidth: 460 }}>
            {c.lead}
          </p>

          <div
            style={{ padding: "14px 16px", background: "#F6F8FB", border: "1px solid #E3EDF5", borderRadius: 12, fontSize: 13, lineHeight: 1.55, color: "#3F576B", maxWidth: 460 }}
            className="md:mt-[34px]"
          >
            <strong style={{ color: "#1F5E8C" }}>{c.privacyLabel}</strong>
            {c.privacyText}
          </div>
        </div>

        {/* Right: form */}
        <div style={{ background: "#fff" }} className="px-5 md:px-[50px] py-7 md:py-[56px] md:border-l md:border-[#EFE7D6]">
          <CenterApplicationForm labels={c.form} countries={countries} locale={locale} />
        </div>
      </div>

      <HomeFooter dict={dict.footer} locale={locale} />
    </div>
  )
}
