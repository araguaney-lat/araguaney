"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import type { TransferOut, TransferDetailOut, TransferStatus, Center, BoxOut } from "@/types"
import { StatusTimeline } from "@/components/StatusTimeline"
import {
  createTransferAction,
  approveTransferAction,
  rejectTransferAction,
  dispatchTransferAction,
  receiveTransferAction,
} from "@/lib/transfer-actions"

const STATUS_LABELS: Record<TransferStatus, string> = {
  REQUESTED: "Solicitada",
  APPROVED: "Aprobada",
  IN_TRANSIT: "En tránsito",
  RECEIVED: "Recibida",
  REJECTED: "Rechazada",
}

const STATUS_COLORS: Record<TransferStatus, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  IN_TRANSIT: "bg-purple-100 text-purple-800",
  RECEIVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
}

export default function TransfersPage() {
  const { data: session } = useSession()
  const myCenter = (session as { centerId?: string | null } | null)?.centerId ?? null
  const myRole = (session as { centerRole?: string | null } | null)?.centerRole ?? null

  const [transfers, setTransfers] = useState<TransferOut[]>([])
  const [activeDetail, setActiveDetail] = useState<TransferDetailOut | null>(null)
  const [centers, setCenters] = useState<Center[]>([])
  const [sealedBoxes, setSealedBoxes] = useState<BoxOut[]>([])
  const [tab, setTab] = useState<"outgoing" | "incoming" | "all">("outgoing")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTransfer, setNewTransfer] = useState({
    from_center_id: myCenter ?? "",
    to_center_id: "",
    notes: "",
    box_ids: [] as string[],
  })
  const [rejectReason, setRejectReason] = useState("")
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const fetchTransfers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (tab === "outgoing" && myCenter) params.set("from_center_id", myCenter)
      if (tab === "incoming" && myCenter) params.set("to_center_id", myCenter)
      const res = await fetch(`/api/transfers?${params}`)
      if (!res.ok) throw new Error("Error al cargar transferencias")
      setTransfers(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const fetchDetail = async (id: string) => {
    const res = await fetch(`/api/transfers/${id}`)
    if (res.ok) setActiveDetail(await res.json())
  }

  useEffect(() => { fetchTransfers() }, [tab])

  useEffect(() => {
    fetch("/api/centers")
      .then((r) => r.ok ? r.json() : [])
      .then(setCenters)
      .catch(() => setCenters([]))
  }, [])

  const fetchSealedBoxes = async () => {
    const res = await fetch("/api/boxes?status=SEALED")
    if (res.ok) setSealedBoxes(await res.json())
  }

  const handleCreate = async () => {
    if (!newTransfer.to_center_id || newTransfer.box_ids.length === 0) return
    setActionLoading("create")
    const result = await createTransferAction({
      from_center_id: newTransfer.from_center_id,
      to_center_id: newTransfer.to_center_id,
      box_ids: newTransfer.box_ids,
      notes: newTransfer.notes || undefined,
    })
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      setShowCreate(false)
      setNewTransfer({ from_center_id: myCenter ?? "", to_center_id: "", notes: "", box_ids: [] })
      await fetchTransfers()
    }
  }

  const handleAction = async (
    id: string,
    action: "approve" | "dispatch" | "receive",
  ) => {
    setActionLoading(id + "-" + action)
    const fns = {
      approve: approveTransferAction,
      dispatch: dispatchTransferAction,
      receive: receiveTransferAction,
    }
    const result = await fns[action](id)
    setActionLoading(null)
    if (result.error) setError(result.error)
    else {
      await fetchTransfers()
      if (activeDetail?.id === id) await fetchDetail(id)
    }
  }

  const handleReject = async (id: string) => {
    setActionLoading(id + "-reject")
    const result = await rejectTransferAction(id, rejectReason || undefined)
    setActionLoading(null)
    setRejectingId(null)
    setRejectReason("")
    if (result.error) setError(result.error)
    else {
      await fetchTransfers()
      if (activeDetail?.id === id) await fetchDetail(id)
    }
  }

  const canApproveOrReject = (t: TransferOut) =>
    t.status === "REQUESTED" &&
    (myRole === "national_admin" || myCenter === t.from_center_id)

  const canDispatch = (t: TransferOut) =>
    t.status === "APPROVED" &&
    (myRole === "national_admin" || myCenter === t.from_center_id)

  const canReceive = (t: TransferOut) =>
    t.status === "IN_TRANSIT" &&
    (myRole === "national_admin" || myCenter === t.to_center_id)

  const centerName = (id: string) =>
    centers.find((c) => c.id === id)?.name ?? id.slice(0, 8)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Transferencias</h1>
        <button
          onClick={() => { setShowCreate(true); fetchSealedBoxes() }}
          className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700"
        >
          + Nueva transferencia
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-sm text-zinc-900">Nueva transferencia</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myRole === "national_admin" && (
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Centro origen</span>
                <select
                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  value={newTransfer.from_center_id}
                  onChange={(e) => setNewTransfer({ ...newTransfer, from_center_id: e.target.value, box_ids: [] })}
                >
                  <option value="">— Seleccionar —</option>
                  {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            )}
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Centro destino</span>
              <select
                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={newTransfer.to_center_id}
                onChange={(e) => setNewTransfer({ ...newTransfer, to_center_id: e.target.value })}
              >
                <option value="">— Seleccionar —</option>
                {centers
                  .filter((c) => c.id !== newTransfer.from_center_id)
                  .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Notas (opcional)</span>
              <input
                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={newTransfer.notes}
                onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
              />
            </label>
          </div>

          {/* Box selector */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 mb-2">
              Cajas selladas disponibles
              {newTransfer.box_ids.length > 0 && (
                <span className="ml-2 text-zinc-900">{newTransfer.box_ids.length} seleccionadas</span>
              )}
            </p>
            {sealedBoxes.length === 0 ? (
              <p className="text-sm text-zinc-400">No hay cajas selladas disponibles.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 border border-zinc-200 rounded-lg p-2">
                {sealedBoxes.map((box) => {
                  const selected = newTransfer.box_ids.includes(box.id)
                  return (
                    <label
                      key={box.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors ${selected ? "bg-zinc-100" : "hover:bg-zinc-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          setNewTransfer((prev) => ({
                            ...prev,
                            box_ids: e.target.checked
                              ? [...prev.box_ids, box.id]
                              : prev.box_ids.filter((id) => id !== box.id),
                          }))
                        }}
                        className="rounded"
                      />
                      <span className="font-mono text-xs text-zinc-700">{box.code}</span>
                      <span className="text-xs text-zinc-500">{box.quantity} {box.unit}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newTransfer.to_center_id || newTransfer.box_ids.length === 0 || actionLoading === "create"}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50"
            >
              {actionLoading === "create" ? "Creando…" : "Crear transferencia"}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["outgoing", "incoming", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${tab === t ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500"}`}
          >
            {t === "outgoing" ? "Enviando" : t === "incoming" ? "Recibiendo" : "Todas"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Transfer list */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-zinc-400">Cargando…</p>
          ) : transfers.length === 0 ? (
            <p className="text-sm text-zinc-400">No hay transferencias.</p>
          ) : transfers.map((t) => (
            <div
              key={t.id}
              onClick={() => fetchDetail(t.id)}
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${activeDetail?.id === t.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-400"}`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm font-medium text-zinc-900">
                  <span className="text-zinc-500 font-normal">De </span>{centerName(t.from_center_id)}
                  <span className="text-zinc-400 mx-1">→</span>
                  {centerName(t.to_center_id)}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>
                  {STATUS_LABELS[t.status]}
                </span>
              </div>
              {t.notes && <p className="mt-1 text-xs text-zinc-400">{t.notes}</p>}

              {/* Quick actions */}
              <div
                className="mt-2 flex gap-2 flex-wrap"
                onClick={(e) => e.stopPropagation()}
              >
                {canApproveOrReject(t) && (
                  <>
                    <button
                      onClick={() => handleAction(t.id, "approve")}
                      disabled={!!actionLoading}
                      className="text-xs px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"
                    >
                      {actionLoading === t.id + "-approve" ? "…" : "Aprobar"}
                    </button>
                    <button
                      onClick={() => setRejectingId(t.id)}
                      disabled={!!actionLoading}
                      className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </>
                )}
                {canDispatch(t) && (
                  <button
                    onClick={() => handleAction(t.id, "dispatch")}
                    disabled={!!actionLoading}
                    className="text-xs px-2 py-1 rounded border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                  >
                    {actionLoading === t.id + "-dispatch" ? "…" : "Despachar"}
                  </button>
                )}
                {canReceive(t) && (
                  <button
                    onClick={() => handleAction(t.id, "receive")}
                    disabled={!!actionLoading}
                    className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                  >
                    {actionLoading === t.id + "-receive" ? "…" : "Confirmar recepción"}
                  </button>
                )}
              </div>

              {/* Reject reason inline form */}
              {rejectingId === t.id && (
                <div
                  className="mt-3 flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    autoFocus
                    placeholder="Motivo (opcional)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="flex-1 text-sm border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                  <button
                    onClick={() => handleReject(t.id)}
                    disabled={!!actionLoading}
                    className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === t.id + "-reject" ? "…" : "Confirmar rechazo"}
                  </button>
                  <button
                    onClick={() => { setRejectingId(null); setRejectReason("") }}
                    className="text-xs text-zinc-500 hover:text-zinc-800"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {activeDetail && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {centerName(activeDetail.from_center_id)} → {centerName(activeDetail.to_center_id)}
                </p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[activeDetail.status]}`}>
                  {STATUS_LABELS[activeDetail.status]}
                </span>
              </div>
              <button onClick={() => setActiveDetail(null)} className="text-zinc-400 hover:text-zinc-700 text-sm">✕</button>
            </div>

            {activeDetail.notes && (
              <p className="text-xs text-zinc-500 border-l-2 border-zinc-200 pl-2">{activeDetail.notes}</p>
            )}

            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-2">
                {activeDetail.boxes.length} caja{activeDetail.boxes.length !== 1 ? "s" : ""}
              </p>
              {activeDetail.boxes.length === 0 ? (
                <p className="text-sm text-zinc-400">Sin cajas.</p>
              ) : (
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {activeDetail.boxes.map((box) => (
                    <li key={box.id} className="flex items-center justify-between text-xs border-b border-zinc-100 pb-1">
                      <span className="font-mono text-zinc-700">{box.code}</span>
                      <span className="text-zinc-500">{box.quantity} {box.unit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {activeDetail.events.length > 0 && (
              <div className="border-t border-zinc-100 pt-4">
                <p className="text-xs font-semibold text-zinc-500 mb-3">Historial</p>
                <StatusTimeline events={activeDetail.events.map((e) => ({
                  from_status: e.from_status,
                  to_status: e.to_status,
                  note: e.note,
                  ts: e.ts,
                }))} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
