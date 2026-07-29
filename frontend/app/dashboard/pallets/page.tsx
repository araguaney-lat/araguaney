"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { ScanLine } from "lucide-react"
import { useSession } from "next-auth/react"
import { apiFetch } from "@/lib/api"
import type { Center, PalletOut, PalletDetailOut, PalletStatus, EventOut } from "@/types"
import { StatusTimeline } from "@/components/StatusTimeline"
import {
  createPalletAction,
  addBoxToPalletAction,
  closePalletAction,
} from "@/lib/pallet-actions"
import { useExportJob } from "@/hooks/useExportJob"
import { useDict } from "@/context/DictionaryContext"

// @zxing/browser solo hace falta cuando se abre la camara — fuera del bundle inicial.
const CameraScanner = dynamic(
  () => import("@/components/CameraScanner").then((mod) => mod.CameraScanner),
  { ssr: false }
)

// El QR de una caja codifica la URL publica de su ficha, {base}/b/{code}.
// Del escaneo puede llegar esa URL o el codigo pelado si alguien lo teclea.
function parseBoxCode(scanned: string): string {
  try {
    const path = new URL(scanned).pathname
    if (path.startsWith("/b/")) return path.slice(3).toUpperCase()
  } catch {
    // no era una URL: se trata como codigo directo
  }
  return scanned.trim().toUpperCase()
}

const STATUS_COLORS: Record<PalletStatus, string> = {
  OPEN: "bg-dDraftB text-dDraftT",
  CLOSED: "bg-dSealB text-dSealT",
  SHIPPED: "bg-dShipB text-dShipT",
}

export default function PalletsPage() {
  const dict = useDict()
  const t = dict.dashboard.pallets
  const tc = dict.dashboard.common

  const { data: session } = useSession()
  const isNationalAdmin = session?.centerRole === "national_admin"
  const token = session?.accessToken ?? ""

  // national_admin has no home center — they must pick one before creating
  // a pallet. Coordinator never sees this, their own center is used
  // automatically server-side.
  const [centers, setCenters] = useState<Center[]>([])
  const [selectedCenterId, setSelectedCenterId] = useState("")

  useEffect(() => {
    if (!isNationalAdmin || !token) return
    apiFetch<Center[]>("/v1/centers", { token })
      .then((data) => {
        setCenters(data)
        if (data.length > 0) setSelectedCenterId((id) => id || data[0].id)
      })
      .catch(() => setCenters([]))
  }, [isNationalAdmin, token])

  const [pallets, setPallets] = useState<PalletOut[]>([])
  const [filter, setFilter] = useState<PalletStatus | "">("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePallet, setActivePallet] = useState<PalletDetailOut | null>(null)
  const [palletEvents, setPalletEvents] = useState<EventOut[]>([])
  const [boxCodeInput, setBoxCodeInput] = useState("")
  const [scanning, setScanning] = useState(false)
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
    if (isNationalAdmin && !selectedCenterId) { setError(tc.select_center_label); return }
    setActionLoading("create")
    const result = await createPalletAction(undefined, isNationalAdmin ? selectedCenterId : undefined)
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      await fetchPallets()
    }
  }

  // `code` llega cuando la caja entra por la camara: el estado del input aun no
  // se ha actualizado en ese momento, asi que el codigo viaja como argumento.
  const handleAddBox = async (code?: string) => {
    const value = (code ?? boxCodeInput).trim().toUpperCase()
    if (!activePallet || !value) return
    setActionLoading("add-box")
    const result = await addBoxToPalletAction(activePallet.id, value)
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      setBoxCodeInput("")
      setActivePallet(result.data as PalletDetailOut)
      await fetchPallets()
    }
  }

  const handleScan = useCallback((scanned: string) => {
    setScanning(false)
    setError(null)
    const code = parseBoxCode(scanned)
    setBoxCodeInput(code)
    handleAddBox(code)
  }, [activePallet, boxCodeInput]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-tx">{t.title}</h1>
        <div className="flex items-center gap-2">
          {isNationalAdmin && centers.length > 0 && (
            <select
              value={selectedCenterId}
              onChange={(e) => setSelectedCenterId(e.target.value)}
              className="rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            >
              {centers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleCreate}
            disabled={actionLoading === "create" || (isNationalAdmin && !selectedCenterId)}
            className="px-4 py-2 bg-[var(--gold)] text-[#3B2A00] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {actionLoading === "create" ? t.creating : t.new}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-dRejB p-3 text-sm text-dRejT">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>{dict.dashboard.common.close}</button>
        </div>
      )}

      <div className="flex gap-2">
        {(["", "OPEN", "CLOSED", "SHIPPED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === s ? "bg-[var(--gold)] text-[#3B2A00] border-[var(--gold)]" : "bg-card text-mut border-cardB hover:border-sec"}`}
          >
            {s === "" ? t.filter_all : t.status[s as PalletStatus]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pallet list */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-fnt">{dict.dashboard.common.loading}</p>
          ) : pallets.length === 0 ? (
            <p className="text-sm text-fnt">{t.empty}</p>
          ) : pallets.map((pallet) => (
            <div
              key={pallet.id}
              onClick={() => fetchPalletDetail(pallet.id)}
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${activePallet?.id === pallet.id ? "border-[var(--gold)] bg-card" : "border-cardB bg-card hover:border-sec"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-tx">{pallet.code}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[pallet.status]}`}>
                  {t.status[pallet.status]}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                {pallet.status === "OPEN" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClose(pallet.id) }}
                    disabled={actionLoading === pallet.id}
                    className="text-xs px-2 py-1 rounded border border-[var(--dSealT)] text-dSealT hover:bg-dSealB disabled:opacity-50"
                  >
                    {actionLoading === pallet.id ? t.closing : t.close}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownloadLabel(pallet.id) }}
                  disabled={labelExport.isBusy}
                  className="text-xs px-2 py-1 rounded border border-cardB text-mut hover:bg-card2 disabled:opacity-50"
                >
                  {labelExport.isBusy ? dict.dashboard.common.exporting : t.label_pdf}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Active pallet detail */}
        {activePallet && (
          <div className="rounded-xl border border-cardB bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono font-bold text-lg text-tx">{activePallet.code}</h2>
              <button onClick={() => { setActivePallet(null); setPalletEvents([]) }} className="text-fnt hover:text-tx text-sm">✕</button>
            </div>

            {activePallet.status === "OPEN" && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t.add_box_placeholder}
                  value={boxCodeInput}
                  onChange={(e) => setBoxCodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddBox()}
                  className="flex-1 text-sm border border-inpB bg-inp rounded-lg px-3 py-2 font-mono uppercase text-tx placeholder:normal-case placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                />
                <button
                  type="button"
                  onClick={() => setScanning(true)}
                  title={t.scan_box}
                  aria-label={t.scan_box}
                  className="px-3 py-2 rounded-lg border border-cardB bg-chip text-sm text-tx hover:bg-card2"
                >
                  <ScanLine className="h-4 w-4" aria-hidden />
                </button>
                <button
                  onClick={() => handleAddBox()}
                  disabled={!boxCodeInput.trim() || actionLoading === "add-box"}
                  className="px-3 py-2 bg-[var(--gold)] text-[#3B2A00] rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading === "add-box" ? "..." : t.add}
                </button>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-fnt mb-2">
                {activePallet.boxes.length === 1
                  ? t.box_count_one
                  : t.box_count_other.replace("{count}", String(activePallet.boxes.length))}
              </p>
              {activePallet.boxes.length === 0 ? (
                <p className="text-sm text-fnt">{t.no_boxes}</p>
              ) : (
                <ul className="space-y-1">
                  {activePallet.boxes.map((box) => (
                    <li key={box.id} className="flex items-center justify-between text-sm border-b border-line pb-1">
                      <span className="font-mono text-xs text-mut">{box.code}</span>
                      <span className="text-xs text-mut">{box.quantity} {box.unit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {palletEvents.length > 0 && (
              <div className="border-t border-line pt-4">
                <p className="text-xs font-semibold text-fnt mb-3">{dict.dashboard.common.history}</p>
                <StatusTimeline events={palletEvents} />
              </div>
            )}
          </div>
        )}
      </div>

      {scanning && (
        <CameraScanner
          onResult={handleScan}
          onClose={() => setScanning(false)}
          label={t.scan_label}
        />
      )}
    </div>
  )
}
