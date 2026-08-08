"use client"

import { useState, useEffect } from "react"
import type { TransferOut } from "@/types"
import { useDict } from "@/context/DictionaryContext"

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  IN_TRANSIT: "bg-purple-100 text-purple-800",
  RECEIVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
}

const STATUS_FILTERS = ["", "REQUESTED", "APPROVED", "IN_TRANSIT", "RECEIVED", "REJECTED"]

export default function StudioTransfersPage() {
  const dict = useDict()
  const t = dict.studio.transfers
  const statusLabels = dict.dashboard.transfers.status
  const [transfers, setTransfers] = useState<TransferOut[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga o suscripción de datos intencional al montar o al cambiar de filtro; migrar a una capa de datos (SWR/react-query) se rastrea aparte
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    fetch(`/api/transfers/studio?${params}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setTransfers(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [statusFilter])

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">{t.title}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t.subtitle}</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500"}`}
          >
            {s ? statusLabels[s as keyof typeof statusLabels] : t.filter_all}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">{t.loading}</div>
        ) : transfers.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">{t.empty}</div>
        ) : (
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t.col_origin}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t.col_destination}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t.col_status}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t.col_date}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t.col_id}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {transfers.map((tr) => (
                <tr key={tr.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600">{tr.from_center_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600">{tr.to_center_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[tr.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                      {statusLabels[tr.status as keyof typeof statusLabels] ?? tr.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(tr.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{tr.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
