import type { Metadata } from "next"
import LegalDoc from "@/components/legal/LegalDoc"
import { getDictionary } from "@/lib/i18n"
import { termsEn } from "@/content/legal/terms.en"

const DESCRIPTION =
  "Araguaney Terms and Conditions: nature of the service, acceptable use, donation rejection rules, data responsibility and governing law."

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: DESCRIPTION,
  alternates: { canonical: "/terms", languages: { es: "/terminos" } },
}

export default async function TermsPage() {
  const dict = await getDictionary("en")
  return <LegalDoc dict={dict} locale="en" localeLinks={{ es: "/terminos" }} doc={termsEn} />
}
