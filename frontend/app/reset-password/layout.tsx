import type { Metadata } from "next"
import { getLocale, getDictionary } from "@/lib/i18n"
import { DictionaryProvider } from "@/context/DictionaryContext"
import { LocaleProvider } from "@/context/LocaleContext"

export const metadata: Metadata = {
  title: "Restablecer contraseña",
  robots: { index: false, follow: false },
}

export default async function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  return (
    <LocaleProvider locale={locale}>
      <DictionaryProvider dict={dict} locale={locale}>{children}</DictionaryProvider>
    </LocaleProvider>
  )
}
