import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { getManual, readManualHtml } from "../manuals"
import { getLocale } from "@/lib/i18n"

const BACK_LABEL = { es: "Ayuda", en: "Help" } as const

export default async function ManualPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const meta = getManual(slug)
  if (!meta) notFound()

  const locale = await getLocale()
  const html = readManualHtml(slug, locale)

  return (
    <div className="mx-auto max-w-[860px]">
      <Link
        href="/dashboard/ayuda"
        className="mb-4 inline-flex items-center gap-1 text-sm text-mut hover:text-tx"
      >
        <ChevronLeft size={16} />
        {BACK_LABEL[locale]}
      </Link>
      {/* Manual body styled by the scoped .manual stylesheet (see ../manual.css) */}
      <div className="manual" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
