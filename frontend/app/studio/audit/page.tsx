"use client"

import { useDict } from "@/context/DictionaryContext"

export default function StudioAuditPage() {
  const dict = useDict()
  const t = dict.studio.audit

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-tx">{t.title}</h1>
        <p className="text-sm text-mut mt-1">{t.subtitle}</p>
      </div>
      <div className="rounded-xl border border-cardB bg-card p-8 text-center">
        <p className="text-sm text-mut">{t.coming_soon}</p>
      </div>
    </div>
  )
}
