import type { Metadata } from "next"

import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import ManageDonation from "@/components/ManageDonation"
import { getManagedDonation } from "@/lib/donation-actions"
import { getDictionary } from "@/lib/i18n"

// Es un enlace privado que llega por correo: no se indexa ni se comparte.
export const metadata: Metadata = { robots: { index: false, follow: false } }

// Ruta fuera de /[lang]: el correo que trae aquí va en español y el contenido de
// gestión también, así que fijamos "es" en vez de detectar idioma para no dejar
// el encabezado en un idioma y el cuerpo en otro.
const LOCALE = "es"

export default async function ManageDonationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const donation = await getManagedDonation(token)
  const dict = await getDictionary(LOCALE)

  return (
    <>
      <HomeNav dict={dict.nav} locale={LOCALE} localeLinks={{}} />
      {/* flex-1 + wrapper centrado: el <body> del layout raíz es min-h-full
          flex-col, así que un main que crece empuja el footer al fondo aunque el
          contenido sea corto (el enlace vencido, por ejemplo). */}
      <main className="flex flex-1 flex-col px-4 py-12">
        <div className="mx-auto w-full max-w-2xl">
          {donation === null ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
              <h1 className="font-serif text-2xl font-bold text-zinc-900">Este enlace ya no sirve</h1>
              <p className="mt-3 text-sm text-zinc-600">
                Los enlaces de gestión vencen a los 30 días, y dejan de funcionar en cuanto entregas
                la donación. Si necesitas algo, escríbenos a{" "}
                <a className="text-amber-700 underline" href="mailto:hola@araguaney.lat">hola@araguaney.lat</a>.
              </p>
            </div>
          ) : (
            <ManageDonation token={token} donation={donation} />
          )}
        </div>
      </main>
      <HomeFooter dict={dict.footer} locale={LOCALE} />
    </>
  )
}
