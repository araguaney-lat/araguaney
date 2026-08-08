"use client"

import { useState, useEffect } from "react"
import type { BoxOut, BoxStatus, EventOut } from "@/types"
import { StatusTimeline } from "@/components/StatusTimeline"
import { sealBoxAction } from "@/lib/box-actions"
import { useExportJob } from "@/hooks/useExportJob"
import { useDict } from "@/context/DictionaryContext"

const STATUS_COLORS: Record<BoxStatus, string> = {
  DRAFT: "bg-dDraftB text-dDraftT",
  SEALED: "bg-dSealB text-dSealT",
  SHIPPED: "bg-dShipB text-dShipT",
  REJECTED: "bg-dRejB text-dRejT",
}

export default function BoxesPage() {
  const dict = useDict()
  const t = dict.dashboard.boxes

  const [boxes, setBoxes] = useState<BoxOut[]>([])
  const [filter, setFilter] = useState<BoxStatus | "">("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sealing, setSealing] = useState<string | null>(null)
  const [expandedBoxId, setExpandedBoxId] = useState<string | null>(null)
  const [boxEvents, setBoxEvents] = useState<Record<string, EventOut[]>>({})
  const labelsExport = useExportJob()

  const fetchBoxes = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = filter ? `?status=${filter}` : ""
      const res = await fetch(`/api/boxes${params}`)
      if (!res.ok) throw new Error(dict.dashboard.common.error_unknown)
      setBoxes(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : dict.dashboard.common.error_unknown)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBoxes() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- carga o suscripción de datos intencional al montar o al cambiar de filtro; migrar a una capa de datos (SWR/react-query) se rastrea aparte

  const handleSeal = async (boxId: string) => {
    setSealing(boxId)
    const result = await sealBoxAction(boxId)
    setSealing(null)
    if (result.error) {
      setError(result.error)
    } else {
      setBoxes((prev) => prev.map((b) => b.id === boxId ? { ...b, status: "SEALED" as BoxStatus, sealed_at: new Date().toISOString() } : b))
    }
  }

  const handleDownloadPdf = () => {
    setError(null)
    labelsExport.start(`/v1/boxes/labels/pdf?status=${filter || "DRAFT"}`)
  }

  const toggleBoxDetail = async (boxId: string) => {
    if (expandedBoxId === boxId) {
      setExpandedBoxId(null)
      return
    }
    setExpandedBoxId(boxId)
    if (!boxEvents[boxId]) {
      const res = await fetch(`/api/boxes/${boxId}/events`)
      if (res.ok) {
        const events: EventOut[] = await res.json()
        setBoxEvents((prev) => ({ ...prev, [boxId]: events }))
      }
    }
  }

  const draftCount = boxes.filter((b) => b.status === "DRAFT").length
  // El error del export se muestra derivándolo en el render, no espejándolo a
  // un useState con un effect: una fuente menos de la que salga desincronizado.
  const shownError = error ?? labelsExport.error

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-tx">{t.title}</h1>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as BoxStatus | "")}
            className="rounded-lg border border-inpB bg-inp px-3 py-1.5 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          >
            <option value="">{t.filter_all}</option>
            {(["DRAFT", "SEALED", "REJECTED", "SHIPPED"] as BoxStatus[]).map((s) => (
              <option key={s} value={s}>{t.status[s]}</option>
            ))}
          </select>
          <button
            onClick={handleDownloadPdf}
            disabled={labelsExport.isBusy || boxes.length === 0}
            className="rounded-lg border border-cardB bg-card px-3 py-1.5 text-sm text-sec hover:bg-card2 disabled:opacity-50"
          >
            {labelsExport.isBusy ? t.generating_pdf : t.download_labels}
          </button>
        </div>
      </div>

      {draftCount > 0 && (
        <div className="mb-4 rounded-lg bg-dDraftB px-4 py-2 text-sm text-dDraftT">
          {draftCount === 1 ? t.draft_pending_one : t.draft_pending_other.replace("{count}", String(draftCount))}
        </div>
      )}

      {shownError && (
        <div className="mb-4 rounded-lg bg-dRejB px-4 py-2 text-sm text-dRejT">
          {shownError}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-mut">{dict.dashboard.common.loading}</div>
      ) : boxes.length === 0 ? (
        <div className="rounded-xl border border-cardB bg-card p-8 text-center text-sm text-mut">
          {t.empty}
        </div>
      ) : (
        <div className="space-y-2">
          {boxes.map((box) => (
            <div
              key={box.id}
              className="rounded-xl border border-cardB bg-card"
            >
              <div
                className="flex flex-wrap items-start gap-3 p-4 cursor-pointer"
                onClick={() => toggleBoxDetail(box.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-tx">{box.code}</span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[box.status as BoxStatus]}`}>
                      {t.status[box.status as BoxStatus]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-mut">
                    {box.quantity} {box.unit}
                    {box.batch && ` · ${t.batch_label}: ${box.batch}`}
                    {box.expiry_date && ` · ${t.expiry_label}: ${new Date(box.expiry_date + "T00:00:00").toLocaleDateString()}`}
                  </p>
                  {box.reject_reason && (
                    <p className="mt-1 text-xs text-[var(--dRejT)] font-medium">⊘ {box.reject_reason}</p>
                  )}
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`/b/${box.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-cardB px-2 py-1 text-xs text-sec hover:bg-card2"
                  >
                    {t.view_card}
                  </a>
                  {box.status === "DRAFT" && (
                    <button
                      onClick={() => handleSeal(box.id)}
                      disabled={sealing === box.id}
                      className="rounded-lg bg-[var(--gold)] px-3 py-1.5 text-xs font-medium text-[#3B2A00] hover:opacity-90 disabled:opacity-60"
                    >
                      {sealing === box.id ? t.sealing : t.seal}
                    </button>
                  )}
                </div>
              </div>

              {expandedBoxId === box.id && (
                <div className="border-t border-line px-4 pb-4 pt-3">
                  <p className="text-xs font-semibold text-fnt mb-3">{dict.dashboard.common.history}</p>
                  {boxEvents[box.id] && boxEvents[box.id].length > 0 ? (
                    <StatusTimeline events={boxEvents[box.id]} />
                  ) : (
                    <p className="text-xs text-fnt">{dict.dashboard.common.no_events}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
