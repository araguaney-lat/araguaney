"use client"

import { useDict } from "@/context/DictionaryContext"

export default function StudioUsersPage() {
  const dict = useDict()
  const t = dict.studio.users

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">{t.title}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t.subtitle}</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-sm text-zinc-500">{t.coming_soon}</p>
      </div>
    </div>
  )
}
