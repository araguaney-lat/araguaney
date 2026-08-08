"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api"
import { useDict } from "@/context/DictionaryContext"

interface Donation {
  id: string
  code: string
  status: string
  items: { free_text: string | null; quantity: number; unit: string }[]
}

export default function DonationsPage() {
  const dict = useDict()
  const t = dict.dashboard.donations
  const { data: session } = useSession()
  const token = session?.accessToken ?? ""

  const [tab, setTab] = useState<"incoming" | "received">("incoming")

  const donationsQuery = useQuery({
    queryKey: ["donations", tab],
    queryFn: () => apiFetch<Donation[]>(`/v1/donations?incoming=${tab === "incoming"}`, { token }),
    enabled: !!token,
  })
  const rows = donationsQuery.data ?? []
  const loading = donationsQuery.isLoading

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-tx">{t.title}</h1>
      <p className="mt-1 text-sm text-mut">{t.list_subtitle}</p>

      <div className="mt-5 flex overflow-hidden rounded-lg border border-inpB text-sm">
        {(["incoming", "received"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setTab(v)}
            className={`px-4 py-1.5 ${tab === v ? "bg-[var(--blue)] text-white" : "bg-card text-mut hover:bg-card2"}`}
          >
            {v === "incoming" ? t.tab_incoming : t.tab_received}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-fnt">{dict.dashboard.common.loading}</p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-cardB bg-card p-6 text-center text-sm text-fnt">
            {tab === "incoming" ? t.empty_incoming : t.empty_received}
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/donations/${d.code}`}
                  className="block rounded-xl border border-cardB bg-card p-4 hover:bg-card2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-tx">{d.code}</span>
                    <span className="text-xs text-mut">
                      {d.items.length === 1
                        ? t.item_count_one
                        : t.item_count_other.replace("{count}", String(d.items.length))}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-fnt">
                    {d.items.map((i) => i.free_text).filter(Boolean).join(" · ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
