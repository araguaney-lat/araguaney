"use client"

import { useState, useEffect, useTransition } from "react"
import type { BoxOut, BoxStatus, EventOut } from "@/types"
import { StatusTimeline } from "@/components/StatusTimeline"
import { sealBoxAction, downloadLabelsPdfAction } from "@/lib/box-actions"

const STATUS_LABELS: Record<BoxStatus, string> = {
  DRAFT: "Borrador",
  SEALED: "Sellada",
  SHIPPED: "Enviada",
  REJECTED: "Rechazada",
}

const STATUS_COLORS: Record<BoxStatus, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  SEALED: "bg-green-100 text-green-800",
  SHIPPED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
}

export default function BoxesPage() {
  const [boxes, setBoxes] = useState<BoxOut[]>([])
  const [filter, setFilter] = useState<BoxStatus | "">("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sealing, setSealing] = useState<string | null>(null)
  const [expandedBoxId, setExpandedBoxId] = useState<string | null>(null)
  const [boxEvents, setBoxEvents] = useState<Record<string, EventOut[]>>({})
  const [isPending, startTransition] = useTransition()

  const fetchBoxes = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = filter ? `?status=${filter}` : ""
      const res = await fetch(`/api/boxes${params}`)
      if (!res.ok) throw new Error("Error al cargar cajas")
      setBoxes(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBoxes() }, [filter])

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

  const handleDownloadPdf = async () => {
    startTransition(async () => {
      const result = await downloadLabelsPdfAction(filter || "DRAFT")
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.pdf) {
        const bytes = Uint8Array.from(atob(result.pdf), (c) => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = result.filename ?? "etiquetas.pdf"
        a.click()
        URL.revokeObjectURL(url)
      }
    })
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Cajas</h1>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as BoxStatus | "")}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <option value="">Todos los estados</option>
            {(["DRAFT", "SEALED", "REJECTED", "SHIPPED"] as BoxStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            onClick={handleDownloadPdf}
            disabled={isPending || boxes.length === 0}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {isPending ? "Generando PDF…" : "Descargar etiquetas A4"}
          </button>
        </div>
      </div>

      {draftCount > 0 && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          {draftCount} caja{draftCount !== 1 ? "s" : ""} en borrador pendiente{draftCount !== 1 ? "s" : ""} de sellado.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-400">Cargando…</div>
      ) : boxes.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          No hay cajas con este estado.
        </div>
      ) : (
        <div className="space-y-2">
          {boxes.map((box) => (
            <div
              key={box.id}
              className="rounded-xl border border-zinc-200 bg-white"
            >
              <div
                className="flex flex-wrap items-start gap-3 p-4 cursor-pointer"
                onClick={() => toggleBoxDetail(box.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-zinc-900">{box.code}</span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[box.status as BoxStatus]}`}>
                      {STATUS_LABELS[box.status as BoxStatus]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {box.quantity} {box.unit}
                    {box.batch && ` · Lote: ${box.batch}`}
                    {box.expiry_date && ` · Cad: ${new Date(box.expiry_date + "T00:00:00").toLocaleDateString("es-MX")}`}
                  </p>
                  {box.reject_reason && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⊘ {box.reject_reason}</p>
                  )}
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`/b/${box.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                  >
                    Ver ficha
                  </a>
                  {box.status === "DRAFT" && (
                    <button
                      onClick={() => handleSeal(box.id)}
                      disabled={sealing === box.id}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
                    >
                      {sealing === box.id ? "Sellando…" : "Sellar caja"}
                    </button>
                  )}
                </div>
              </div>

              {expandedBoxId === box.id && (
                <div className="border-t border-zinc-100 px-4 pb-4 pt-3">
                  <p className="text-xs font-semibold text-zinc-500 mb-3">Historial</p>
                  {boxEvents[box.id] && boxEvents[box.id].length > 0 ? (
                    <StatusTimeline events={boxEvents[box.id]} />
                  ) : (
                    <p className="text-xs text-zinc-400">Sin eventos registrados.</p>
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
