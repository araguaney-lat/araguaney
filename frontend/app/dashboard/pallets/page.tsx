"use client"

import { useState, useEffect } from "react"
import type { PalletOut, PalletDetailOut, PalletStatus, EventOut } from "@/types"
import { StatusTimeline } from "@/components/StatusTimeline"
import {
  createPalletAction,
  addBoxToPalletAction,
  closePalletAction,
} from "@/lib/pallet-actions"
import { useExportJob } from "@/hooks/useExportJob"
import { useDict } from "@/context/DictionaryContext"

const STATUS_COLORS: Record<PalletStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  CLOSED: "bg-green-100 text-green-800",
  SHIPPED: "bg-blue-100 text-blue-800",
}

export default function PalletsPage() {
  const dict = useDict()
  const t = dict.dashboard.pallets

  const [pallets, setPallets] = useState<PalletOut[]>([])
  const [filter, setFilter] = useState<PalletStatus | "">("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePallet, setActivePallet] = useState<PalletDetailOut | null>(null)
  const [palletEvents, setPalletEvents] = useState<EventOut[]>([])
  const [boxCodeInput, setBoxCodeInput] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const labelExport = useExportJob()

  const fetchPallets = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = filter ? `?status=${filter}` : ""
      const res = await fetch(`/api/pallets${params}`)
      if (!res.ok) throw new Error(dict.dashboard.common.error_unknown)
      setPallets(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : dict.dashboard.common.error_unknown)
    } finally {
      setLoading(false)
    }
  }

  const fetchPalletDetail = async (id: string) => {
    const [detailRes, eventsRes] = await Promise.all([
      fetch(`/api/pallets/${id}`),
      fetch(`/api/pallets/${id}/events`),
    ])
    if (detailRes.ok) setActivePallet(await detailRes.json())
    if (eventsRes.ok) setPalletEvents(await eventsRes.json())
    else setPalletEvents([])
  }

  useEffect(() => { fetchPallets() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (labelExport.error) setError(labelExport.error)
  }, [labelExport.error])

  const handleCreate = async () => {
    setActionLoading("create")
    const result = await createPalletAction()
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      await fetchPallets()
    }
  }

  const handleAddBox = async () => {
    if (!activePallet || !boxCodeInput.trim()) return
    setActionLoading("add-box")
    const result = await addBoxToPalletAction(activePallet.id, boxCodeInput.trim().toUpperCase())
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      setBoxCodeInput("")
      setActivePallet(result.data as PalletDetailOut)
      await fetchPallets()
    }
  }

  const handleClose = async (palletId: string) => {
    setActionLoading(palletId)
    const result = await closePalletAction(palletId)
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      setPallets((prev) => prev.map((p) => p.id === palletId ? { ...p, status: "CLOSED" as PalletStatus } : p))
      if (activePallet?.id === palletId) setActivePallet({ ...activePallet, status: "CLOSED" })
    }
  }

  const handleDownloadLabel = (palletId: string) => {
    setError(null)
    labelExport.start(`/v1/pallets/${palletId}/label.pdf`)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">{t.title}</h1>
        <button
          onClick={handleCreate}
          disabled={actionLoading === "create"}
          className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50"
        >
          {actionLoading === "create" ? t.creating : t.new}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>{dict.dashboard.common.close}</button>
        </div>
      )}

      <div className="flex gap-2">
        {(["", "OPEN", "CLOSED", "SHIPPED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === s ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500"}`}
          >
            {s === "" ? t.filter_all : t.status[s as PalletStatus]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pallet list */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-zinc-400">{dict.dashboard.common.loading}</p>
          ) : pallets.length === 0 ? (
            <p className="text-sm text-zinc-400">{t.empty}</p>
          ) : pallets.map((pallet) => (
            <div
              key={pallet.id}
              onClick={() => fetchPalletDetail(pallet.id)}
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${activePallet?.id === pallet.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-400"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-zinc-900">{pallet.code}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[pallet.status]}`}>
                  {t.status[pallet.status]}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                {pallet.status === "OPEN" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClose(pallet.id) }}
                    disabled={actionLoading === pallet.id}
                    className="text-xs px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    {actionLoading === pallet.id ? t.closing : t.close}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownloadLabel(pallet.id) }}
                  disabled={labelExport.isBusy}
                  className="text-xs px-2 py-1 rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {labelExport.isBusy ? dict.dashboard.common.exporting : t.label_pdf}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Active pallet detail */}
        {activePallet && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono font-bold text-lg">{activePallet.code}</h2>
              <button onClick={() => { setActivePallet(null); setPalletEvents([]) }} className="text-zinc-400 hover:text-zinc-700 text-sm">✕</button>
            </div>

            {activePallet.status === "OPEN" && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t.add_box_placeholder}
                  value={boxCodeInput}
                  onChange={(e) => setBoxCodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddBox()}
                  className="flex-1 text-sm border border-zinc-300 rounded-lg px-3 py-2 font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
                <button
                  onClick={handleAddBox}
                  disabled={!boxCodeInput.trim() || actionLoading === "add-box"}
                  className="px-3 py-2 bg-zinc-900 text-white rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50"
                >
                  {actionLoading === "add-box" ? "..." : t.add}
                </button>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-2">
                {activePallet.boxes.length === 1
                  ? t.box_count_one
                  : t.box_count_other.replace("{count}", String(activePallet.boxes.length))}
              </p>
              {activePallet.boxes.length === 0 ? (
                <p className="text-sm text-zinc-400">{t.no_boxes}</p>
              ) : (
                <ul className="space-y-1">
                  {activePallet.boxes.map((box) => (
                    <li key={box.id} className="flex items-center justify-between text-sm border-b border-zinc-100 pb-1">
                      <span className="font-mono text-xs text-zinc-700">{box.code}</span>
                      <span className="text-xs text-zinc-500">{box.quantity} {box.unit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {palletEvents.length > 0 && (
              <div className="border-t border-zinc-100 pt-4">
                <p className="text-xs font-semibold text-zinc-500 mb-3">{dict.dashboard.common.history}</p>
                <StatusTimeline events={palletEvents} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
