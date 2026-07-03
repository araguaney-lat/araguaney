"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { apiFetch } from "@/lib/api"
import type { Campaign, Center, ShipmentOut, ShipmentDetailOut, ShipmentStatus, PalletOut, EventOut } from "@/types"
import { StatusTimeline } from "@/components/StatusTimeline"
import {
  createShipmentAction,
  addPalletToShipmentAction,
  closeShipmentAction,
  shipShipmentAction,
} from "@/lib/shipment-actions"
import { useExportJob } from "@/hooks/useExportJob"
import { useDict } from "@/context/DictionaryContext"

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  CLOSED: "bg-green-100 text-green-800",
  SHIPPED: "bg-blue-100 text-blue-800",
}

export default function ShipmentsPage() {
  const dict = useDict()
  const t = dict.dashboard.shipments
  const tc = dict.dashboard.common

  const { data: session } = useSession()
  const isNationalAdmin = session?.centerRole === "national_admin"
  const token = session?.accessToken ?? ""

  // national_admin has no home center — they must pick one before creating
  // a shipment. Coordinator never sees this, their own center is used
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

  const [shipments, setShipments] = useState<ShipmentOut[]>([])
  const [filter, setFilter] = useState<ShipmentStatus | "">("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeShipment, setActiveShipment] = useState<ShipmentDetailOut | null>(null)
  const [shipmentEvents, setShipmentEvents] = useState<EventOut[]>([])
  const [closedPallets, setClosedPallets] = useState<PalletOut[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedPalletId, setSelectedPalletId] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newShipment, setNewShipment] = useState({ campaign_id: "", destination: "Venezuela", carrier: "", reference: "", notes: "" })
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const manifestExport = useExportJob()

  const fetchShipments = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = filter ? `?status=${filter}` : ""
      const res = await fetch(`/api/shipments${params}`)
      if (!res.ok) throw new Error(dict.dashboard.common.error_unknown)
      setShipments(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : dict.dashboard.common.error_unknown)
    } finally {
      setLoading(false)
    }
  }

  const fetchShipmentDetail = async (id: string) => {
    const [detailRes, eventsRes] = await Promise.all([
      fetch(`/api/shipments/${id}`),
      fetch(`/api/shipments/${id}/events`),
    ])
    if (detailRes.ok) setActiveShipment(await detailRes.json())
    if (eventsRes.ok) setShipmentEvents(await eventsRes.json())
    else setShipmentEvents([])
  }

  const fetchClosedPallets = async () => {
    const res = await fetch("/api/pallets?status=CLOSED")
    if (res.ok) setClosedPallets(await res.json())
  }

  useEffect(() => { fetchShipments() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (manifestExport.error) setError(manifestExport.error)
  }, [manifestExport.error])

  useEffect(() => {
    fetch("/api/campaigns?active_only=true")
      .then((r) => r.ok ? r.json() : [])
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
  }, [])

  const handleCreate = async () => {
    if (isNationalAdmin && !selectedCenterId) { setError(tc.select_center_label); return }
    setActionLoading("create")
    const result = await createShipmentAction({
      ...newShipment,
      campaign_id: newShipment.campaign_id || undefined,
      center_id: isNationalAdmin ? selectedCenterId : undefined,
    })
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      setShowCreateForm(false)
      setNewShipment({ campaign_id: "", destination: "Venezuela", carrier: "", reference: "", notes: "" })
      await fetchShipments()
    }
  }

  const handleAddPallet = async () => {
    if (!activeShipment || !selectedPalletId) return
    setActionLoading("add-pallet")
    const result = await addPalletToShipmentAction(activeShipment.id, selectedPalletId)
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      setSelectedPalletId("")
      setActiveShipment(result.data as ShipmentDetailOut)
      await fetchShipments()
      await fetchClosedPallets()
    }
  }

  const handleClose = async (shipmentId: string) => {
    setActionLoading(shipmentId + "-close")
    const result = await closeShipmentAction(shipmentId)
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      setShipments((prev) => prev.map((s) => s.id === shipmentId ? { ...s, status: "CLOSED" as ShipmentStatus } : s))
      if (activeShipment?.id === shipmentId) setActiveShipment({ ...activeShipment, status: "CLOSED" })
    }
  }

  const handleShip = async (shipmentId: string) => {
    setActionLoading(shipmentId + "-ship")
    const result = await shipShipmentAction(shipmentId)
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      setShipments((prev) => prev.map((s) => s.id === shipmentId ? { ...s, status: "SHIPPED" as ShipmentStatus } : s))
      if (activeShipment?.id === shipmentId) setActiveShipment({ ...activeShipment, status: "SHIPPED" })
    }
  }

  const handleDownloadManifest = (shipmentId: string) => {
    setError(null)
    manifestExport.start(`/v1/shipments/${shipmentId}/manifest.pdf`)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">{t.title}</h1>
        <button
          onClick={() => { setShowCreateForm(true); fetchClosedPallets() }}
          className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700"
        >
          {t.new}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>{dict.dashboard.common.close}</button>
        </div>
      )}

      {showCreateForm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold text-sm text-zinc-900">{t.create_title}</h2>
          <div className="grid grid-cols-2 gap-3">
            {isNationalAdmin && (
              <label className="space-y-1 col-span-2">
                <span className="text-xs text-zinc-500">{tc.select_center_label}</span>
                {centers.length === 0 ? (
                  <p className="text-sm text-zinc-400">{tc.no_centers_available}</p>
                ) : (
                  <select
                    className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    value={selectedCenterId}
                    onChange={(e) => setSelectedCenterId(e.target.value)}
                  >
                    {centers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </label>
            )}
            <label className="space-y-1 col-span-2">
              <span className="text-xs text-zinc-500">{t.field_campaign}</span>
              <select
                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={newShipment.campaign_id}
                onChange={(e) => setNewShipment({ ...newShipment, campaign_id: e.target.value })}
              >
                <option value="">{t.no_campaign}</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.destination_country ? ` (${c.destination_country})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">{t.field_destination}</span>
              <input className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={newShipment.destination} onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">{t.field_carrier}</span>
              <input className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={newShipment.carrier} onChange={(e) => setNewShipment({ ...newShipment, carrier: e.target.value })} placeholder={t.field_carrier_placeholder} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">{t.field_reference}</span>
              <input className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={newShipment.reference} onChange={(e) => setNewShipment({ ...newShipment, reference: e.target.value })} placeholder={t.field_reference_placeholder} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">{t.field_notes}</span>
              <input className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={newShipment.notes} onChange={(e) => setNewShipment({ ...newShipment, notes: e.target.value })} />
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={actionLoading === "create" || (isNationalAdmin && !selectedCenterId)}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50">
              {actionLoading === "create" ? t.creating : t.create_btn}
            </button>
            <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900">{t.cancel}</button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(["", "OPEN", "CLOSED", "SHIPPED"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === s ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500"}`}>
            {s === "" ? t.filter_all : t.status[s as ShipmentStatus]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shipment list */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-zinc-400">{dict.dashboard.common.loading}</p>
          ) : shipments.length === 0 ? (
            <p className="text-sm text-zinc-400">{t.empty}</p>
          ) : shipments.map((shipment) => (
            <div key={shipment.id}
              onClick={() => { fetchShipmentDetail(shipment.id); fetchClosedPallets() }}
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${activeShipment?.id === shipment.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-400"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-zinc-900">{shipment.destination}</span>
                  {shipment.reference && <span className="ml-2 text-xs text-zinc-500 font-mono">{shipment.reference}</span>}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[shipment.status]}`}>
                  {t.status[shipment.status]}
                </span>
              </div>
              {shipment.carrier && <p className="text-xs text-zinc-400 mt-1">{shipment.carrier}</p>}
              <div className="mt-2 flex gap-2 flex-wrap">
                {shipment.status === "OPEN" && (
                  <button onClick={(e) => { e.stopPropagation(); handleClose(shipment.id) }}
                    disabled={actionLoading === shipment.id + "-close"}
                    className="text-xs px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50">
                    {actionLoading === shipment.id + "-close" ? t.closing : t.close}
                  </button>
                )}
                {shipment.status === "CLOSED" && (
                  <button onClick={(e) => { e.stopPropagation(); handleShip(shipment.id) }}
                    disabled={actionLoading === shipment.id + "-ship"}
                    className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                    {actionLoading === shipment.id + "-ship" ? t.dispatching : t.dispatch}
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); handleDownloadManifest(shipment.id) }}
                  disabled={manifestExport.isBusy}
                  className="text-xs px-2 py-1 rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
                  {manifestExport.isBusy ? dict.dashboard.common.exporting : t.manifest_pdf}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Active shipment detail */}
        {activeShipment && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-zinc-900">
                {activeShipment.destination}
                {activeShipment.reference && <span className="ml-2 font-mono text-xs text-zinc-400">{activeShipment.reference}</span>}
              </h2>
              <button onClick={() => { setActiveShipment(null); setShipmentEvents([]) }} className="text-zinc-400 hover:text-zinc-700 text-sm">✕</button>
            </div>

            {activeShipment.status === "OPEN" && (
              <div className="flex gap-2">
                <select value={selectedPalletId} onChange={(e) => setSelectedPalletId(e.target.value)}
                  className="flex-1 text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400">
                  <option value="">{t.select_pallet}</option>
                  {closedPallets
                    .filter((p) => !activeShipment.pallets.some((ap) => ap.id === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.code}</option>
                    ))}
                </select>
                <button onClick={handleAddPallet} disabled={!selectedPalletId || actionLoading === "add-pallet"}
                  className="px-3 py-2 bg-zinc-900 text-white rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50">
                  {actionLoading === "add-pallet" ? "..." : t.add_pallet}
                </button>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-2">
                {activeShipment.pallets.length === 1
                  ? t.pallet_count_one
                  : t.pallet_count_other.replace("{count}", String(activeShipment.pallets.length))}
              </p>
              {activeShipment.pallets.length === 0 ? (
                <p className="text-sm text-zinc-400">{t.no_pallets_empty}</p>
              ) : (
                <ul className="space-y-2">
                  {activeShipment.pallets.map((pallet) => (
                    <li key={pallet.id} className="border border-zinc-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-zinc-800">{pallet.code}</span>
                        <span className="text-xs text-zinc-400">
                          {pallet.boxes.length === 1
                            ? t.box_count_one
                            : t.box_count_other.replace("{count}", String(pallet.boxes.length))}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {shipmentEvents.length > 0 && (
              <div className="border-t border-zinc-100 pt-4">
                <p className="text-xs font-semibold text-zinc-500 mb-3">{dict.dashboard.common.history}</p>
                <StatusTimeline events={shipmentEvents} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
