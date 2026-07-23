import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import ConfirmCenterApplication, { type ConfirmLabels } from "@/components/ConfirmCenterApplication"
import { getDictionary } from "@/lib/i18n"
import { alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"

const KEY = "registrar-centro/confirmar"

interface Content {
  metaTitle: string
  description: string
  labels: ConfirmLabels
}

const CONTENT: Record<Locale, Content> = {
  es: {
    metaTitle: "Confirmar solicitud de centro",
    description: "Confirma tu solicitud de alta de centro de acopio.",
    labels: {
      loading: "Confirmando tu solicitud…",
      successTitle: "Correo verificado",
      successBody:
        "Tu correo quedó confirmado. Ahora el equipo de Araguaney revisará tu solicitud. Cuando sea aprobada recibirás un correo con una contraseña temporal para acceder a tu centro. No necesitas hacer nada más por ahora.",
      invalidTitle: "Enlace no válido",
      invalidBody:
        "Este enlace de confirmación no es válido, ya fue usado o expiró. Si ya lo confirmaste, tu solicitud sigue en revisión.",
      errorTitle: "Algo salió mal",
      errorBody: "No pudimos confirmar tu solicitud en este momento. Intenta de nuevo más tarde.",
      homeCta: "Ir al inicio",
      loginCta: "Iniciar sesión",
    },
  },
  en: {
    metaTitle: "Confirm center application",
    description: "Confirm your collection center registration request.",
    labels: {
      loading: "Confirming your application…",
      successTitle: "Email verified",
      successBody:
        "Your email is confirmed. The Araguaney team will now review your application. Once approved, you'll receive an email with a temporary password to access your center. Nothing else is needed for now.",
      invalidTitle: "Invalid link",
      invalidBody:
        "This confirmation link is invalid, has already been used, or has expired. If you already confirmed it, your application is still under review.",
      errorTitle: "Something went wrong",
      errorBody: "We couldn't confirm your application right now. Please try again later.",
      homeCta: "Go home",
      loginCta: "Sign in",
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
    robots: { index: false, follow: false },
  }
}

export default async function ConfirmCenterApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>
  searchParams: Promise<{ token?: string }>
}) {
  const { lang: locale } = await params
  const { token } = await searchParams
  const c = CONTENT[locale]
  const dict = await getDictionary(locale)

  return (
    <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <HomeNav dict={dict.nav} locale={locale} localeLinks={{ es: localizedPath("", "es"), en: localizedPath("", "en") }} />
      <div className="h-[56px] md:hidden" />

      <div className="flex-1 flex items-center justify-center px-5 py-16 md:py-24">
        <ConfirmCenterApplication token={token ?? null} labels={c.labels} homeHref={localizedPath("", locale)} />
      </div>

      <HomeFooter dict={dict.footer} locale={locale} />
    </div>
  )
}
