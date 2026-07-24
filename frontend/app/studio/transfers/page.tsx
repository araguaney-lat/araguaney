"use client"

import { useState, useEffect } from "react"
import type { TransferOut } from "@/types"
import { useDict } from "@/context/DictionaryContext"

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-dDraftB text-dDraftT",
  APPROVED: "bg-blueSoft text-[var(--blue)]",
  IN_TRANSIT: "bg-dShipB text-dShipT",
  RECEIVED: "bg-dSealB text-dSealT",
  REJECTED: "bg-dRejB text-dRejT",
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
        <h1 className="text-2xl font-semibold text-tx">{t.title}</h1>
        <p className="text-sm text-mut mt-1">{t.subtitle}</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? "bg-[var(--blue)] text-white border-[var(--blue)]" : "bg-card text-mut border-cardB hover:border-goldB"}`}
          >
            {s ? statusLabels[s as keyof typeof statusLabels] : t.filter_all}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-cardB bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-fnt">{t.loading}</div>
        ) : transfers.length === 0 ? (
          <div className="p-8 text-center text-sm text-fnt">{t.empty}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-card2">
                <th className="text-left px-4 py-3 text-xs font-semibold text-mut uppercase tracking-wide">{t.col_origin}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-mut uppercase tracking-wide">{t.col_destination}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-mut uppercase tracking-wide">{t.col_status}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-mut uppercase tracking-wide">{t.col_date}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-mut uppercase tracking-wide">{t.col_id}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {transfers.map((tr) => (
                <tr key={tr.id} className="hover:bg-card2 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-mut">{tr.from_center_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 font-mono text-xs text-mut">{tr.to_center_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[tr.status] ?? "bg-chip text-mut"}`}>
                      {statusLabels[tr.status as keyof typeof statusLabels] ?? tr.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-mut">
                    {new Date(tr.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-fnt">{tr.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
