import type { Metadata } from "next"
import LegalDoc from "@/components/legal/LegalDoc"
import { getDictionary } from "@/lib/i18n"
import { privacyEn } from "@/content/legal/privacy.en"

const DESCRIPTION =
  "Araguaney Privacy Notice: what personal data we process about users, for what purposes, our processors, and how to exercise your data rights."

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy", languages: { es: "/aviso-de-privacidad" } },
}

export default async function PrivacyPage() {
  const dict = await getDictionary("en")
  return <LegalDoc dict={dict} locale="en" localeLinks={{ es: "/aviso-de-privacidad" }} doc={privacyEn} />
}
