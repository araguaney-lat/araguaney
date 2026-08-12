"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiGet } from "@/lib/query"
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
import { useExportJob } from "@/hooks/useExportJob"
import { useDict } from "@/context/DictionaryContext"

import { PageAction } from "@/components/PageAction"

const STATUS_COLORS: Record<TransferStatus, string> = {
  REQUESTED: "bg-dDraftB text-dDraftT",
  APPROVED: "bg-blueSoft text-[var(--blue)]",
  IN_TRANSIT: "bg-goldSoft text-[var(--gold)]",
  RECEIVED: "bg-dSealB text-dSealT",
  REJECTED: "bg-dRejB text-dRejT",
}

export default function TransfersPage() {
  const dict = useDict()
  const t = dict.dashboard.transfers

  const { data: session } = useSession()
  const myCenter = (session as { centerId?: string | null } | null)?.centerId ?? null
  const myRole = (session as { centerRole?: string | null } | null)?.centerRole ?? null

  const qc = useQueryClient()
  const [activeDetail, setActiveDetail] = useState<TransferDetailOut | null>(null)
  const [sealedBoxes, setSealedBoxes] = useState<BoxOut[]>([])
  const [tab, setTab] = useState<"outgoing" | "incoming" | "all">("outgoing")
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
  const manifestExport = useExportJob()

  // Lista por pestaña y centros, leídos con React Query; las acciones invalidan.
  const transfersQuery = useQuery({
    queryKey: ["transfers", tab, myCenter ?? ""],
    queryFn: () => {
      const params = new URLSearchParams()
      if (tab === "outgoing" && myCenter) params.set("from_center_id", myCenter)
      if (tab === "incoming" && myCenter) params.set("to_center_id", myCenter)
      return apiGet<TransferOut[]>(`/api/transfers?${params}`)
    },
  })
  const transfers = transfersQuery.data ?? []
  const loading = transfersQuery.isPending
  const refetchTransfers = () => qc.invalidateQueries({ queryKey: ["transfers"] })

  const centersQuery = useQuery({
    queryKey: ["centers"],
    queryFn: () => apiGet<Center[]>("/api/centers"),
  })
  const centers = centersQuery.data ?? []

  const fetchDetail = async (id: string) => {
    const res = await fetch(`/api/transfers/${id}`)
    if (res.ok) setActiveDetail(await res.json())
  }

  // Error del export y de la lista, derivado en el render.
  const listError = transfersQuery.error instanceof Error ? transfersQuery.error.message : null
  const shownError = error ?? listError ?? manifestExport.error

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
      refetchTransfers()
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
      refetchTransfers()
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
      refetchTransfers()
      if (activeDetail?.id === id) await fetchDetail(id)
    }
  }

  const canApproveOrReject = (tr: TransferOut) =>
    tr.status === "REQUESTED" &&
    (myRole === "national_admin" || myCenter === tr.from_center_id)

  const canDispatch = (tr: TransferOut) =>
    tr.status === "APPROVED" &&
    (myRole === "national_admin" || myCenter === tr.from_center_id)

  const canReceive = (tr: TransferOut) =>
    tr.status === "IN_TRANSIT" &&
    (myRole === "national_admin" || myCenter === tr.to_center_id)

  const centerName = (id: string) =>
    centers.find((c) => c.id === id)?.name ?? id.slice(0, 8)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-tx">{t.title}</h1>
        <PageAction
          onClick={() => { setShowCreate(true); fetchSealedBoxes() }}
          icon="plus"
          label={t.new}
        />
      </div>

      {shownError && (
        <div className="rounded-lg bg-dRejB border border-dRejB p-3 text-sm text-dRejT">
          {shownError}
          <button className="ml-2 underline" onClick={() => { setError(null); manifestExport.reset() }}>{dict.dashboard.common.close}</button>
        </div>
      )}

      {showCreate && (
        <div className="rounded-xl border border-cardB bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-tx">{t.create_title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myRole === "national_admin" && (
              <label className="space-y-1">
                <span className="text-xs text-mut">{t.field_from}</span>
                <select
                  className="w-full text-sm border border-inpB rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                  value={newTransfer.from_center_id}
                  onChange={(e) => setNewTransfer({ ...newTransfer, from_center_id: e.target.value, box_ids: [] })}
                >
                  <option value="">{t.select_placeholder}</option>
                  {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            )}
            <label className="space-y-1">
              <span className="text-xs text-mut">{t.field_to}</span>
              <select
                className="w-full text-sm border border-inpB rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                value={newTransfer.to_center_id}
                onChange={(e) => setNewTransfer({ ...newTransfer, to_center_id: e.target.value })}
              >
                <option value="">{t.select_placeholder}</option>
                {centers
                  .filter((c) => c.id !== newTransfer.from_center_id)
                  .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-mut">{t.field_notes}</span>
              <input
                className="w-full text-sm border border-inpB rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                value={newTransfer.notes}
                onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-semibold text-mut mb-2">
              {t.available_boxes}
              {newTransfer.box_ids.length > 0 && (
                <span className="ml-2 text-tx">
                  {newTransfer.box_ids.length === 1
                    ? t.box_count_one
                    : t.box_count_other.replace("{count}", String(newTransfer.box_ids.length))}
                </span>
              )}
            </p>
            {sealedBoxes.length === 0 ? (
              <p className="text-sm text-fnt">{t.no_sealed_boxes}</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 border border-cardB rounded-lg p-2">
                {sealedBoxes.map((box) => {
                  const selected = newTransfer.box_ids.includes(box.id)
                  return (
                    <label
                      key={box.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors ${selected ? "bg-chip" : "hover:bg-card2"}`}
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
                      <span className="font-mono text-xs text-mut">{box.code}</span>
                      <span className="text-xs text-mut">{box.quantity} {box.unit}</span>
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
              className="px-4 py-2 bg-[var(--blue)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
            >
              {actionLoading === "create" ? t.creating : t.create_btn}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-mut hover:text-tx">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(["outgoing", "incoming", "all"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${tab === tabKey ? "bg-[var(--blue)] text-white border-[var(--blue)]" : "bg-card text-mut border-inpB hover:border-goldB"}`}
          >
            {tabKey === "outgoing" ? t.tab_outgoing : tabKey === "incoming" ? t.tab_incoming : t.tab_all}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-fnt">{dict.dashboard.common.loading}</p>
          ) : transfers.length === 0 ? (
            <p className="text-sm text-fnt">{t.empty}</p>
          ) : transfers.map((tr) => (
            <div
              key={tr.id}
              onClick={() => fetchDetail(tr.id)}
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${activeDetail?.id === tr.id ? "border-[var(--blue)] bg-card2" : "border-cardB bg-card hover:border-goldB"}`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm font-medium text-tx">
                  <span className="text-mut font-normal">{t.from_label} </span>{centerName(tr.from_center_id)}
                  <span className="text-fnt mx-1">→</span>
                  {centerName(tr.to_center_id)}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[tr.status]}`}>
                  {t.status[tr.status]}
                </span>
              </div>
              {tr.notes && <p className="mt-1 text-xs text-fnt">{tr.notes}</p>}

              <div
                className="mt-2 flex gap-2 flex-wrap"
                onClick={(e) => e.stopPropagation()}
              >
                {canApproveOrReject(tr) && (
                  <>
                    <button
                      onClick={() => handleAction(tr.id, "approve")}
                      disabled={!!actionLoading}
                      className="text-xs px-2 py-1 rounded border border-dSealB text-dSealT hover:bg-dSealB disabled:opacity-50"
                    >
                      {actionLoading === tr.id + "-approve" ? "…" : t.approve}
                    </button>
                    <button
                      onClick={() => setRejectingId(tr.id)}
                      disabled={!!actionLoading}
                      className="text-xs px-2 py-1 rounded border border-dRejB text-dRejT hover:bg-dRejB disabled:opacity-50"
                    >
                      {t.reject}
                    </button>
                  </>
                )}
                {canDispatch(tr) && (
                  <button
                    onClick={() => handleAction(tr.id, "dispatch")}
                    disabled={!!actionLoading}
                    className="text-xs px-2 py-1 rounded border border-goldB text-[var(--gold)] hover:bg-goldSoft disabled:opacity-50"
                  >
                    {actionLoading === tr.id + "-dispatch" ? "…" : t.dispatch}
                  </button>
                )}
                {canReceive(tr) && (
                  <button
                    onClick={() => handleAction(tr.id, "receive")}
                    disabled={!!actionLoading}
                    className="text-xs px-2 py-1 rounded border border-[var(--blue)] text-[var(--blue)] hover:bg-blueSoft disabled:opacity-50"
                  >
                    {actionLoading === tr.id + "-receive" ? "…" : t.receive}
                  </button>
                )}
              </div>

              {rejectingId === tr.id && (
                <div
                  className="mt-3 flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    autoFocus
                    placeholder={t.reject_reason_placeholder}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="flex-1 text-sm border border-inpB rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                  <button
                    onClick={() => handleReject(tr.id)}
                    disabled={!!actionLoading}
                    className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === tr.id + "-reject" ? "…" : t.confirm_reject}
                  </button>
                  <button
                    onClick={() => { setRejectingId(null); setRejectReason("") }}
                    className="text-xs text-mut hover:text-tx"
                  >
                    {t.cancel}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {activeDetail && (
          <div className="rounded-xl border border-cardB bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-tx">
                  {centerName(activeDetail.from_center_id)} → {centerName(activeDetail.to_center_id)}
                </p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[activeDetail.status]}`}>
                  {t.status[activeDetail.status]}
                </span>
              </div>
              <button onClick={() => setActiveDetail(null)} className="text-fnt hover:text-mut text-sm">✕</button>
            </div>

            {activeDetail.notes && (
              <p className="text-xs text-mut border-l-2 border-cardB pl-2">{activeDetail.notes}</p>
            )}

            <div>
              <p className="text-xs font-semibold text-mut mb-2">
                {activeDetail.boxes.length === 1
                  ? t.box_count_one
                  : t.box_count_other.replace("{count}", String(activeDetail.boxes.length))}
              </p>
              {activeDetail.boxes.length === 0 ? (
                <p className="text-sm text-fnt">{dict.dashboard.common.no_data}</p>
              ) : (
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {activeDetail.boxes.map((box) => (
                    <li key={box.id} className="flex items-center justify-between text-xs border-b border-line pb-1">
                      <span className="font-mono text-mut">{box.code}</span>
                      <span className="text-mut">{box.quantity} {box.unit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {["APPROVED", "IN_TRANSIT", "RECEIVED"].includes(activeDetail.status) && (
              <button
                onClick={() => manifestExport.start(`/v1/transfers/${activeDetail.id}/manifest.pdf`)}
                disabled={manifestExport.isBusy}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-inpB text-mut hover:bg-card2 transition-colors disabled:opacity-50"
              >
                {manifestExport.isBusy ? dict.dashboard.common.exporting : t.download_manifest}
              </button>
            )}

            {activeDetail.events.length > 0 && (
              <div className="border-t border-line pt-4">
                <p className="text-xs font-semibold text-mut mb-3">{dict.dashboard.common.history}</p>
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
