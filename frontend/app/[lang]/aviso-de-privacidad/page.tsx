import type { Metadata } from "next"
import LegalDoc from "@/components/legal/LegalDoc"
import { getDictionary } from "@/lib/i18n"
import { alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"
import { privacyEs } from "@/content/legal/privacy.es"
import { privacyEn } from "@/content/legal/privacy.en"

const KEY = "aviso-de-privacidad"
const DOC = { es: privacyEs, en: privacyEn }
const META: Record<Locale, { title: string; description: string }> = {
  es: {
    title: "Aviso de Privacidad",
    description:
      "Aviso de Privacidad de Araguaney: qué datos personales tratamos de las personas usuarias, con qué fines, encargados y cómo ejercer tus derechos ARCO.",
  },
  en: {
    title: "Privacy Notice",
    description:
      "Araguaney Privacy Notice: what personal data we process about users, for what purposes, our processors, and how to exercise your data rights.",
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

export default async function PrivacyPage({
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
