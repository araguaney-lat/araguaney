import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { getManual, readManualHtml } from "../manuals"

export default async function ManualPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const meta = getManual(slug)
  if (!meta) notFound()

  const html = readManualHtml(slug)

  return (
    <div className="mx-auto max-w-[860px]">
      <Link
        href="/dashboard/ayuda"
        className="mb-4 inline-flex items-center gap-1 text-sm text-mut hover:text-tx"
      >
        <ChevronLeft size={16} />
        Ayuda
      </Link>
      {/* Manual body styled by the scoped .manual stylesheet (see ../manual.css) */}
      <div className="manual" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
