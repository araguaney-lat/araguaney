import type { Metadata } from "next"
import LegalDoc from "@/components/legal/LegalDoc"
import { getDictionary } from "@/lib/i18n"
import { privacyEs } from "@/content/legal/privacy.es"

const DESCRIPTION =
  "Aviso de Privacidad de Araguaney: qué datos personales tratamos de las personas usuarias, con qué fines, encargados y cómo ejercer tus derechos ARCO."

export const metadata: Metadata = {
  title: "Aviso de Privacidad",
  description: DESCRIPTION,
  alternates: { canonical: "/aviso-de-privacidad", languages: { en: "/privacy" } },
}

export default async function AvisoDePrivacidadPage() {
  const dict = await getDictionary("es")
  return <LegalDoc dict={dict} locale="es" localeLinks={{ en: "/privacy" }} doc={privacyEs} />
}
