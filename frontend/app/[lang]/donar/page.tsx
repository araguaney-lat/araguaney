import type { Metadata } from "next"

import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import DonationForm, { type DonationFormLabels } from "@/components/DonationForm"
import { getDictionary } from "@/lib/i18n"
import { alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"

const KEY = "donar"

const META: Record<Locale, { title: string; description: string }> = {
  es: {
    title: "Registra tu donación antes de llevarla",
    description:
      "Registra lo que vas a donar y recibe un código QR. En el centro de acopio solo verifican lo que traes, sin capturarlo todo de nuevo.",
  },
  en: {
    title: "Register your donation before dropping it off",
    description:
      "Register what you are donating and get a QR code. At the collection center they simply verify what you bring, without re-entering everything.",
  },
}

const LABELS: Record<Locale, DonationFormLabels> = {
  es: {
    firstName: "Nombre", lastName: "Apellido", email: "Correo electrónico",
    phone: "Teléfono", phoneHint: "Opcional. Solo por si el centro necesita contactarte.",
    center: "Centro al que piensas llevarla", centerNone: "Aún no lo decido",
    centerHint: "Puedes cambiar de opinión: cualquier centro puede recibir tu código.",
    campaign: "Campaña", campaignNone: "Donaciones generales",
    campaignHint: "Si no eliges, tu donación entra a las donaciones generales.",
    itemsTitle: "¿Qué vas a donar?",
    itemsHint: "Escríbelo como lo dirías: “20 latas de atún”, “3 cobijas”. No necesitas saber nombres técnicos.",
    itemDescription: "Qué es", itemQuantity: "Cantidad", itemUnit: "Unidad (latas, kg, piezas…)",
    addItem: "+ Agregar otro", removeItem: "Quitar",
    notes: "Algo más que debamos saber (opcional)",
    termsLabel: "Entiendo y acepto que donar es transferir la propiedad de forma irrevocable y sin contraprestación: no puedo elegir quién recibe en destino, ni pedir que me devuelvan los bienes, ni exigir que mi donación viaje junta.",
    termsError: "Para registrar tu donación hay que aceptar los Términos de Donación.",
    submit: "Registrar mi donación", submitting: "Registrando…",
    successTitle: "Revisa tu correo",
    successBody: "Te enviamos un enlace para confirmar. Al confirmarlo recibirás tu código QR para llevar al centro.",
    resendPrompt: "¿No te llegó? Revisa tu carpeta de correo no deseado. Si aun así no aparece, podemos enviártelo de nuevo (el enlace anterior dejará de servir).",
    resend: "Reenviar el correo", resending: "Reenviando…",
    resendDone: "Listo, te lo enviamos de nuevo. Puede tardar unos minutos en llegar.",
    turnstileError: "No pudimos verificar que eres una persona. Recarga la página e inténtalo de nuevo.",
    requiredError: "Falta tu nombre, tu correo o al menos un renglón de lo que vas a donar.",
  },
  en: {
    firstName: "First name", lastName: "Last name", email: "Email",
    phone: "Phone", phoneHint: "Optional. Only in case the center needs to reach you.",
    center: "Center you plan to visit", centerNone: "Not decided yet",
    centerHint: "You can change your mind: any center can accept your code.",
    campaign: "Campaign", campaignNone: "General donations",
    campaignHint: "If you do not choose, your donation goes to general donations.",
    itemsTitle: "What are you donating?",
    itemsHint: "Write it the way you would say it: “20 cans of tuna”, “3 blankets”. No technical names needed.",
    itemDescription: "What it is", itemQuantity: "Quantity", itemUnit: "Unit (cans, kg, pieces…)",
    addItem: "+ Add another", removeItem: "Remove",
    notes: "Anything else we should know (optional)",
    termsLabel: "I understand and accept that donating transfers ownership irrevocably and without consideration: I cannot choose who receives the goods at destination, ask for them back, or require my donation to travel together.",
    termsError: "To register your donation you need to accept the Donation Terms.",
    submit: "Register my donation", submitting: "Registering…",
    successTitle: "Check your email",
    successBody: "We sent you a link to confirm. Once you confirm it you will get your QR code to take to the center.",
    resendPrompt: "Did not get it? Check your spam folder. If it is still missing, we can send it again (the previous link will stop working).",
    resend: "Resend the email", resending: "Resending…",
    resendDone: "Done, we sent it again. It may take a few minutes to arrive.",
    turnstileError: "We could not verify you are human. Reload the page and try again.",
    requiredError: "We need your name, your email and at least one line of what you are donating.",
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
  const { lang } = await params
  return { ...META[lang], alternates: alternates(KEY, lang) }
}

export default async function DonatePage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang } = await params
  const dict = await getDictionary(lang)
  // .trim() contra un salto de línea al final del valor de la env (artefacto de
  // pegado común): Turnstile rechaza el sitekey con espacios y el widget no carga.
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ""

  return (
    <>
      <HomeNav
        dict={dict.nav}
        locale={lang}
        localeLinks={{ es: localizedPath("donar", "es"), en: localizedPath("donar", "en") }}
      />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-serif text-3xl font-bold text-zinc-900">{META[lang].title}</h1>
        <p className="mt-3 text-sm text-zinc-600">{META[lang].description}</p>
        <div className="mt-8">
          <DonationForm labels={LABELS[lang]} locale={lang} sitekey={sitekey} />
        </div>
      </main>
      <HomeFooter dict={dict.footer} locale={lang} />
    </>
  )
}
