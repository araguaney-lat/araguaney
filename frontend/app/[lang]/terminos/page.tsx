import type { Metadata } from "next"
import LegalDoc from "@/components/legal/LegalDoc"
import { getDictionary } from "@/lib/i18n"
import { alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"
import { termsEs } from "@/content/legal/terms.es"
import { termsEn } from "@/content/legal/terms.en"

const KEY = "terminos"
const DOC = { es: termsEs, en: termsEn }
const META: Record<Locale, { title: string; description: string }> = {
  es: {
    title: "Términos y Condiciones",
    description:
      "Términos y Condiciones de uso de Araguaney: naturaleza del servicio, uso aceptable, reglas de rechazo de donaciones, responsabilidad de datos y ley aplicable.",
  },
  en: {
    title: "Terms and Conditions",
    description:
      "Araguaney Terms and Conditions: nature of the service, acceptable use, donation rejection rules, data responsibility and governing law.",
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
  const { lang } = await params
  return {
    title: META[lang].title,
    description: META[lang].description,
    alternates: alternates(KEY, lang),
  }
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang } = await params
  const dict = await getDictionary(lang)
  return (
    <LegalDoc
      dict={dict}
      locale={lang}
      localeLinks={{ es: localizedPath(KEY, "es"), en: localizedPath(KEY, "en") }}
      doc={DOC[lang]}
    />
  )
}
