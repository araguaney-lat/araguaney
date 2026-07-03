import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Aceptar Términos y Aviso de Privacidad",
  robots: { index: false, follow: false },
}

export default function AcceptTermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
