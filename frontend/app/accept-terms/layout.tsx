import type { Metadata } from "next"
import { getLocale, getDictionary } from "@/lib/i18n"
import { DictionaryProvider } from "@/context/DictionaryContext"
import { LocaleProvider } from "@/context/LocaleContext"

export const metadata: Metadata = {
  title: "Aceptar Términos y Aviso de Privacidad",
  robots: { index: false, follow: false },
}

export default async function AcceptTermsLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  return (
    <LocaleProvider locale={locale}>
      <DictionaryProvider dict={dict}>{children}</DictionaryProvider>
    </LocaleProvider>
  )
}
