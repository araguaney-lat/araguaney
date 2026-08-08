"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { ScanLine } from "lucide-react"
import { useSession } from "next-auth/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { apiGet } from "@/lib/query"
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
    // /d/ es la ficha de una donación: se reconoce para poder avisar del
    // error de flujo con su código, en vez de devolver la URL entera.
    if (path.startsWith("/b/") || path.startsWith("/d/")) return path.slice(3).toUpperCase()
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
  const qc = useQueryClient()
  const [selectedCenterId, setSelectedCenterId] = useState("")

  const centersQuery = useQuery({
    queryKey: ["centers"],
    queryFn: () => apiFetch<Center[]>("/v1/centers", { token }),
    enabled: isNationalAdmin && !!token,
  })
  const centers = centersQuery.data ?? []
  // Sin auto-selección por effect: cae al primer centro hasta que se elija otro.
  const activeCenterId = isNationalAdmin ? selectedCenterId || centers[0]?.id || "" : ""

  const [filter, setFilter] = useState<PalletStatus | "">("")
  const [error, setError] = useState<string | null>(null)
  const [activePallet, setActivePallet] = useState<PalletDetailOut | null>(null)
  const [palletEvents, setPalletEvents] = useState<EventOut[]>([])
  const [boxCodeInput, setBoxCodeInput] = useState("")
  const [scanning, setScanning] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  // Cerrar es cuando la tarima sube a la báscula: el formulario aparece ahí, y
  // ambos campos son opcionales (una báscula descompuesta no frena el cierre).
  const [closingId, setClosingId] = useState<string | null>(null)
  const [weighing, setWeighing] = useState({ gross: "", height: "" })
  const labelExport = useExportJob()

  // La lista se lee con React Query; las mutaciones la invalidan para releerla.
  const palletsQuery = useQuery({
    queryKey: ["pallets", filter],
    queryFn: () => apiGet<PalletOut[]>(`/api/pallets${filter ? `?status=${filter}` : ""}`),
  })
  const pallets = palletsQuery.data ?? []
  const loading = palletsQuery.isPending
  const refetchPallets = () => qc.invalidateQueries({ queryKey: ["pallets"] })

  const fetchPalletDetail = async (id: string) => {
    const [detailRes, eventsRes] = await Promise.all([
      fetch(`/api/pallets/${id}`),
      fetch(`/api/pallets/${id}/events`),
    ])
    if (detailRes.ok) setActivePallet(await detailRes.json())
    if (eventsRes.ok) setPalletEvents(await eventsRes.json())
    else setPalletEvents([])
  }

  // Error del export derivado en el render, más el de la lista y las acciones.
  const listError = palletsQuery.error instanceof Error ? palletsQuery.error.message : null
  const shownError = error ?? listError ?? labelExport.error

  const handleCreate = async () => {
    if (isNationalAdmin && !activeCenterId) { setError(tc.select_center_label); return }
    setActionLoading("create")
    const result = await createPalletAction(undefined, isNationalAdmin ? activeCenterId : undefined)
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      refetchPallets()
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
      refetchPallets()
    }
  }

  const handleScan = useCallback((scanned: string) => {
    setScanning(false)
    setError(null)
    const code = parseBoxCode(scanned)
    // Un QR de donación aquí es un error de flujo, no una caja: se avisa en vez
    // de mandarlo al backend, que respondería "caja no encontrada".
    if (code.startsWith("DN-")) {
      setError(t.scanned_donation)
      return
    }
    setBoxCodeInput(code)
    handleAddBox(code)
  }, [activePallet, boxCodeInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = async (palletId: string) => {
    setActionLoading(palletId)
    const bruto = parseFloat(weighing.gross)
    const altura = parseInt(weighing.height, 10)
    const result = await closePalletAction(palletId, {
      gross_weight_kg: Number.isFinite(bruto) && bruto > 0 ? bruto : undefined,
      height_cm: Number.isFinite(altura) && altura > 0 ? altura : undefined,
    })
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      refetchPallets()
      if (activePallet?.id === palletId) setActivePallet({ ...activePallet, status: "CLOSED" })
      setClosingId(null)
      setWeighing({ gross: "", height: "" })
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
              value={activeCenterId}
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
            disabled={actionLoading === "create" || (isNationalAdmin && !activeCenterId)}
            className="px-4 py-2 bg-[var(--gold)] text-[#3B2A00] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {actionLoading === "create" ? t.creating : t.new}
          </button>
        </div>
      </div>

      {shownError && (
        <div className="rounded-lg bg-dRejB p-3 text-sm text-dRejT">
          {shownError}
          <button className="ml-2 underline" onClick={() => { setError(null); labelExport.reset() }}>{dict.dashboard.common.close}</button>
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
              {closingId === pallet.id && (
                <div className="mt-3 rounded-lg border border-cardB bg-card2 p-3" onClick={(e) => e.stopPropagation()}>
                  <p className="text-xs font-semibold text-mut">{t.weighing_title}</p>
                  <p className="mt-0.5 text-[11px] text-fnt">{t.weighing_hint}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      type="number" min={0} step="0.001" inputMode="decimal"
                      placeholder={t.gross_placeholder}
                      value={weighing.gross}
                      onChange={(e) => setWeighing((w) => ({ ...w, gross: e.target.value }))}
                      className="rounded-lg border border-inpB bg-inp px-2 py-1.5 text-sm text-tx"
                    />
                    <input
                      type="number" min={0} step="1" inputMode="numeric"
                      placeholder={t.height_placeholder}
                      value={weighing.height}
                      onChange={(e) => setWeighing((w) => ({ ...w, height: e.target.value }))}
                      className="rounded-lg border border-inpB bg-inp px-2 py-1.5 text-sm text-tx"
                    />
                  </div>
                </div>
              )}

              <div className="mt-2 flex gap-2">
                {pallet.status === "OPEN" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (closingId === pallet.id) handleClose(pallet.id)
                      else { setClosingId(pallet.id); setWeighing({ gross: "", height: "" }) }
                    }}
                    disabled={actionLoading === pallet.id}
                    className="text-xs px-2 py-1 rounded border border-[var(--dSealT)] text-dSealT hover:bg-dSealB disabled:opacity-50"
                  >
                    {actionLoading === pallet.id ? t.closing : closingId === pallet.id ? t.confirm_close : t.close}
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

            {activePallet.gross_weight_kg != null && (
              <div className="rounded-lg border border-cardB bg-card2 p-3 text-xs text-fnt">
                <p className="font-semibold text-mut">{t.weighing_summary}</p>
                <p className="mt-1">
                  {t.gross_label}: {Number(activePallet.gross_weight_kg).toFixed(3)} kg
                  {activePallet.tare_weight_kg != null && ` · ${t.tare_label}: ${Number(activePallet.tare_weight_kg).toFixed(3)} kg`}
                  {activePallet.height_cm != null && ` · ${t.height_label}: ${activePallet.height_cm} cm`}
                </p>
                {activePallet.boxes_weight_kg != null && (
                  <p className="mt-1">
                    {t.boxes_weight_label}: {Number(activePallet.boxes_weight_kg).toFixed(3)} kg
                    {activePallet.weight_discrepancy_kg != null && (
                      <span className={Number(activePallet.weight_discrepancy_kg) < 0 ? "text-[var(--dRejT)]" : ""}>
                        {" "}· {t.difference_label}: {Number(activePallet.weight_discrepancy_kg) > 0 ? "+" : ""}
                        {Number(activePallet.weight_discrepancy_kg).toFixed(3)} kg
                      </span>
                    )}
                  </p>
                )}
                {activePallet.weight_discrepancy_kg != null && Number(activePallet.weight_discrepancy_kg) < 0 && (
                  <p className="mt-1 text-[var(--dRejT)]">{t.difference_negative}</p>
                )}
              </div>
            )}

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
