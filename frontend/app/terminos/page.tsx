import type { Metadata } from "next"
import LegalDoc from "@/components/legal/LegalDoc"
import { getDictionary } from "@/lib/i18n"
import { termsEs } from "@/content/legal/terms.es"

const DESCRIPTION =
  "Términos y Condiciones de uso de Araguaney: naturaleza del servicio, uso aceptable, reglas de rechazo de donaciones, responsabilidad de datos y ley aplicable."

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: DESCRIPTION,
  alternates: { canonical: "/terminos", languages: { en: "/terms" } },
}

export default async function TerminosPage() {
  const dict = await getDictionary("es")
  return <LegalDoc dict={dict} locale="es" localeLinks={{ en: "/terms" }} doc={termsEs} />
}
