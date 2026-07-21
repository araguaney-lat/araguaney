import { notFound } from "next/navigation"
import { LOCALES, isLocale } from "@/lib/routes"

// Only these locales exist; anything else 404s (the middleware only rewrites
// valid locales here anyway). <html lang> is set by the root layout from the
// x-locale header the middleware injects — this nested layout must NOT emit
// another <html>.
export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }))
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return <>{children}</>
}
