import type { Metadata } from "next"

import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { confirmDonation } from "@/lib/donation-actions"
import { getDictionary } from "@/lib/i18n"
import { type Locale, localizedPath } from "@/lib/routes"

const COPY: Record<Locale, Record<string, string>> = {
  es: {
    title: "Confirmación de donación",
    okTitle: "¡Listo! Tu donación está registrada",
    okBody: "Te enviamos por correo tu código y el enlace para editarla o cancelarla. Muestra el código cuando llegues al centro de acopio.",
    codeLabel: "Tu código",
    failTitle: "No pudimos confirmar",
    missing: "Falta el enlace de confirmación. Ábrelo desde el correo que te enviamos.",
  },
  en: {
    title: "Donation confirmation",
    okTitle: "Done! Your donation is registered",
    okBody: "We emailed your code and the link to edit or cancel it. Show the code when you arrive at the collection center.",
    codeLabel: "Your code",
    failTitle: "We could not confirm",
    missing: "The confirmation link is missing. Open it from the email we sent you.",
  },
}

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function ConfirmDonationPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>
  searchParams: Promise<{ token?: string }>
}) {
  const { lang } = await params
  const { token } = await searchParams
  const dict = await getDictionary(lang)
  const t = COPY[lang]

  const result = token ? await confirmDonation(token, lang) : null

  return (
    <>
      <HomeNav
        dict={dict.nav}
        locale={lang}
        localeLinks={{ es: localizedPath("donar/confirmar", "es"), en: localizedPath("donar/confirmar", "en") }}
      />
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        {!token ? (
          <>
            <h1 className="font-serif text-2xl font-bold text-zinc-900">{t.failTitle}</h1>
            <p className="mt-3 text-sm text-zinc-600">{t.missing}</p>
          </>
        ) : result?.ok ? (
          <>
            <h1 className="font-serif text-2xl font-bold text-zinc-900">{t.okTitle}</h1>
            <p className="mt-3 text-sm text-zinc-600">{t.okBody}</p>
            <div className="mt-6 inline-block rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-4">
              <p className="text-xs text-zinc-500">{t.codeLabel}</p>
              <p className="font-mono text-2xl font-bold tracking-wide text-zinc-900">{result.code}</p>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl font-bold text-zinc-900">{t.failTitle}</h1>
            <p className="mt-3 text-sm text-zinc-600">{result?.error}</p>
          </>
        )}
      </main>
      <HomeFooter dict={dict.footer} locale={lang} />
    </>
  )
}
