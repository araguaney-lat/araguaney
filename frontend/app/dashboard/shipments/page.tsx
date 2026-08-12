"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiGet } from "@/lib/query"
import { useSession } from "next-auth/react"
import { apiFetch } from "@/lib/api"
import type { Campaign, Center, ShipmentOut, ShipmentDetailOut, ShipmentStatus, PalletOut, EventOut } from "@/types"
import { ShipmentMilestones } from "@/components/ShipmentMilestones"
import { ShipmentIncidents } from "@/components/ShipmentIncidents"
import { ShipmentReception } from "@/components/ShipmentReception"
import { StatusTimeline } from "@/components/StatusTimeline"
import {
  createShipmentAction,
  addPalletToShipmentAction,
  closeShipmentAction,
  shipShipmentAction,
} from "@/lib/shipment-actions"
import { useExportJob } from "@/hooks/useExportJob"
import { useDict } from "@/context/DictionaryContext"

import { PageAction } from "@/components/PageAction"

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  OPEN: "bg-dDraftB text-dDraftT",
  CLOSED: "bg-dSealB text-dSealT",
  SHIPPED: "bg-dShipB text-dShipT",
  // Los dos estados de destino (Fase 22) comparten la paleta de "sellado":
  // son buenas noticias, a diferencia de un rechazo.
  DELIVERED: "bg-dSealB text-dSealT",
  RECONCILED: "bg-dSealB text-dSealT",
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

  const [filter, setFilter] = useState<ShipmentStatus | "">("")
  const [error, setError] = useState<string | null>(null)
  const [activeShipment, setActiveShipment] = useState<ShipmentDetailOut | null>(null)
  const [shipmentEvents, setShipmentEvents] = useState<EventOut[]>([])
  const [closedPallets, setClosedPallets] = useState<PalletOut[]>([])
  const [selectedPalletId, setSelectedPalletId] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newShipment, setNewShipment] = useState({ campaign_id: "", destination: "Venezuela", carrier: "", reference: "", notes: "", height_profile: "" })
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const manifestExport = useExportJob()
  const declarationExport = useExportJob()

  // Lista y campañas leídas con React Query; las mutaciones invalidan la lista.
  const shipmentsQuery = useQuery({
    queryKey: ["shipments", filter],
    queryFn: () => apiGet<ShipmentOut[]>(`/api/shipments${filter ? `?status=${filter}` : ""}`),
  })
  const shipments = shipmentsQuery.data ?? []
  const loading = shipmentsQuery.isPending
  const refetchShipments = () => qc.invalidateQueries({ queryKey: ["shipments"] })

  const campaignsQuery = useQuery({
    queryKey: ["campaigns", "active"],
    queryFn: () => apiGet<Campaign[]>("/api/campaigns?active_only=true"),
  })
  const campaigns = campaignsQuery.data ?? []

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

  // Error de los exports y de la lista, derivado en el render.
  const listError = shipmentsQuery.error instanceof Error ? shipmentsQuery.error.message : null
  const shownError = error ?? listError ?? manifestExport.error ?? declarationExport.error

  const handleCreate = async () => {
    if (isNationalAdmin && !activeCenterId) { setError(tc.select_center_label); return }
    setActionLoading("create")
    const result = await createShipmentAction({
      ...newShipment,
      campaign_id: newShipment.campaign_id || undefined,
      height_profile: newShipment.height_profile || undefined,
      center_id: isNationalAdmin ? activeCenterId : undefined,
    })
    setActionLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      setShowCreateForm(false)
      setNewShipment({ campaign_id: "", destination: "Venezuela", carrier: "", reference: "", notes: "", height_profile: "" })
      refetchShipments()
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
      refetchShipments()
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
      refetchShipments()
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
      refetchShipments()
      if (activeShipment?.id === shipmentId) setActiveShipment({ ...activeShipment, status: "SHIPPED" })
    }
  }

  const handleDownloadManifest = (shipmentId: string) => {
    setError(null)
    manifestExport.start(`/v1/shipments/${shipmentId}/manifest.pdf`)
  }

  // La declaración de mercancías es el insumo para quien despacha: lleva lo que
  // sabemos (qué va, cuánto pesa, cuántos bultos) más los datos que el propio
  // centro capturó sobre sí mismo. No es un comprobante fiscal ni una
  // declaración aduanal, y Araguaney no interpreta el régimen de ningún país.
  const handleDownloadDeclaration = (shipmentId: string, formato: "xlsx" | "json") => {
    setError(null)
    declarationExport.start(`/v1/shipments/${shipmentId}/declaracion.${formato}`)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-tx">{t.title}</h1>
        <PageAction
          onClick={() => { setShowCreateForm(true); fetchClosedPallets() }}
          icon="plus"
          label={t.new}
          variant="destacada"
        />
      </div>

      {shownError && (
        <div className="rounded-lg bg-dRejB p-3 text-sm text-dRejT">
          {shownError}
          <button className="ml-2 underline" onClick={() => { setError(null); manifestExport.reset(); declarationExport.reset() }}>{dict.dashboard.common.close}</button>
        </div>
      )}

      {showCreateForm && (
        <div className="rounded-xl border border-cardB bg-card p-5 space-y-3">
          <h2 className="font-semibold text-sm text-tx">{t.create_title}</h2>
          <div className="grid grid-cols-2 gap-3">
            {isNationalAdmin && (
              <label className="space-y-1 col-span-2">
                <span className="text-xs text-mut">{tc.select_center_label}</span>
                {centers.length === 0 ? (
                  <p className="text-sm text-fnt">{tc.no_centers_available}</p>
                ) : (
                  <select
                    className="w-full text-sm border border-inpB bg-inp text-tx rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                    value={activeCenterId}
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
              <span className="text-xs text-mut">{t.field_campaign}</span>
              <select
                className="w-full text-sm border border-inpB bg-inp text-tx rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
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
              <span className="text-xs text-mut">{t.field_destination}</span>
              <input className="w-full text-sm border border-inpB bg-inp text-tx rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                value={newShipment.destination} onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-mut">{t.field_carrier}</span>
              <input className="w-full text-sm border border-inpB bg-inp text-tx rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                value={newShipment.carrier} onChange={(e) => setNewShipment({ ...newShipment, carrier: e.target.value })} placeholder={t.field_carrier_placeholder} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-mut">{t.field_height_profile}</span>
              <select
                className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx"
                value={newShipment.height_profile}
                onChange={(e) => setNewShipment({ ...newShipment, height_profile: e.target.value })}
              >
                <option value="">{t.height_profile_none}</option>
                <option value="LOWER_DECK_160">{t.profile_lower_deck}</option>
                <option value="XRAY_170">{t.profile_xray}</option>
                <option value="MAIN_DECK_180">{t.profile_main_deck}</option>
                <option value="SIN_RESTRICCION">{t.profile_unrestricted}</option>
              </select>
              <p className="mt-1 text-[11px] text-fnt">{t.height_profile_hint}</p>
            </label>
            <label className="block mt-3">
              <span className="text-xs text-mut">{t.field_reference}</span>
              <input className="w-full text-sm border border-inpB bg-inp text-tx rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                value={newShipment.reference} onChange={(e) => setNewShipment({ ...newShipment, reference: e.target.value })} placeholder={t.field_reference_placeholder} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-mut">{t.field_notes}</span>
              <input className="w-full text-sm border border-inpB bg-inp text-tx rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                value={newShipment.notes} onChange={(e) => setNewShipment({ ...newShipment, notes: e.target.value })} />
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={actionLoading === "create" || (isNationalAdmin && !activeCenterId)}
              className="px-4 py-2 bg-[var(--gold)] text-[#3B2A00] rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
              {actionLoading === "create" ? t.creating : t.create_btn}
            </button>
            <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-sm text-mut hover:text-tx">{t.cancel}</button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(["", "OPEN", "CLOSED", "SHIPPED", "DELIVERED", "RECONCILED"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === s ? "bg-[var(--gold)] text-[#3B2A00] border-[var(--gold)]" : "bg-card text-mut border-cardB hover:border-sec"}`}>
            {s === "" ? t.filter_all : t.status[s as ShipmentStatus]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shipment list */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-fnt">{dict.dashboard.common.loading}</p>
          ) : shipments.length === 0 ? (
            <p className="text-sm text-fnt">{t.empty}</p>
          ) : shipments.map((shipment) => (
            <div key={shipment.id}
              onClick={() => { fetchShipmentDetail(shipment.id); fetchClosedPallets() }}
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${activeShipment?.id === shipment.id ? "border-[var(--gold)] bg-card" : "border-cardB bg-card hover:border-sec"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-tx">{shipment.destination}</span>
                  {shipment.reference && <span className="ml-2 text-xs text-mut font-mono">{shipment.reference}</span>}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[shipment.status]}`}>
                  {t.status[shipment.status]}
                </span>
              </div>
              {shipment.carrier && <p className="text-xs text-fnt mt-1">{shipment.carrier}</p>}
              <div className="mt-2 flex gap-2 flex-wrap">
                {shipment.status === "OPEN" && (
                  <button onClick={(e) => { e.stopPropagation(); handleClose(shipment.id) }}
                    disabled={actionLoading === shipment.id + "-close"}
                    className="text-xs px-2 py-1 rounded border border-[var(--dSealT)] text-dSealT hover:bg-dSealB disabled:opacity-50">
                    {actionLoading === shipment.id + "-close" ? t.closing : t.close}
                  </button>
                )}
                {shipment.status === "CLOSED" && (
                  <button onClick={(e) => { e.stopPropagation(); handleShip(shipment.id) }}
                    disabled={actionLoading === shipment.id + "-ship"}
                    className="text-xs px-2 py-1 rounded border border-[var(--blue)] text-[var(--blue)] hover:bg-[var(--blueSoft)] disabled:opacity-50">
                    {actionLoading === shipment.id + "-ship" ? t.dispatching : t.dispatch}
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); handleDownloadManifest(shipment.id) }}
                  disabled={manifestExport.isBusy}
                  className="text-xs px-2 py-1 rounded border border-cardB text-mut hover:bg-card2 disabled:opacity-50">
                  {manifestExport.isBusy ? dict.dashboard.common.exporting : t.manifest_pdf}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Active shipment detail */}
        {activeShipment && (
          <div className="rounded-xl border border-cardB bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-tx">
                {activeShipment.destination}
                {activeShipment.reference && <span className="ml-2 font-mono text-xs text-fnt">{activeShipment.reference}</span>}
              <div className="mt-3 rounded-lg border border-cardB bg-card2 p-3">
                <p className="text-xs font-semibold text-mut">{t.declaration_title}</p>
                <p className="mt-1 text-[11px] text-fnt">{t.declaration_hint}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadDeclaration(activeShipment.id, "xlsx")}
                    disabled={declarationExport.isBusy}
                    className="text-xs px-2 py-1 rounded border border-cardB text-mut hover:bg-card disabled:opacity-50"
                  >
                    {declarationExport.isBusy ? dict.dashboard.common.exporting : "XLSX"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadDeclaration(activeShipment.id, "json")}
                    disabled={declarationExport.isBusy}
                    className="text-xs px-2 py-1 rounded border border-cardB text-mut hover:bg-card disabled:opacity-50"
                  >
                    {declarationExport.isBusy ? dict.dashboard.common.exporting : "JSON"}
                  </button>
                </div>
              </div>

              {(activeShipment.height_warnings?.length ?? 0) > 0 && (
                <div className="mt-3 rounded-lg border border-[var(--dDraftB)] bg-[var(--dDraftB)] p-3">
                  <p className="text-xs font-semibold text-[var(--dDraftT)]">{t.height_warning_title}</p>
                  <ul className="mt-1 space-y-0.5">
                    {activeShipment.height_warnings!.map((w) => (
                      <li key={w} className="text-xs text-[var(--dDraftT)]">{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              </h2>
              <button onClick={() => { setActiveShipment(null); setShipmentEvents([]) }} className="text-fnt hover:text-tx text-sm">✕</button>
            </div>

            {activeShipment.status === "OPEN" && (
              <div className="flex gap-2">
                <select value={selectedPalletId} onChange={(e) => setSelectedPalletId(e.target.value)}
                  className="flex-1 text-sm border border-inpB bg-inp text-tx rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]">
                  <option value="">{t.select_pallet}</option>
                  {closedPallets
                    .filter((p) => !activeShipment.pallets.some((ap) => ap.id === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.code}</option>
                    ))}
                </select>
                <button onClick={handleAddPallet} disabled={!selectedPalletId || actionLoading === "add-pallet"}
                  className="px-3 py-2 bg-[var(--gold)] text-[#3B2A00] rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
                  {actionLoading === "add-pallet" ? "..." : t.add_pallet}
                </button>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-fnt mb-2">
                {activeShipment.pallets.length === 1
                  ? t.pallet_count_one
                  : t.pallet_count_other.replace("{count}", String(activeShipment.pallets.length))}
              </p>
              {activeShipment.pallets.length === 0 ? (
                <p className="text-sm text-fnt">{t.no_pallets_empty}</p>
              ) : (
                <ul className="space-y-2">
                  {activeShipment.pallets.map((pallet) => (
                    <li key={pallet.id} className="border border-line rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-tx">{pallet.code}</span>
                        <span className="text-xs text-fnt">
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
              <div className="border-t border-line pt-4">
                <p className="text-xs font-semibold text-fnt mb-3">{dict.dashboard.common.history}</p>
                <StatusTimeline events={shipmentEvents} />
              </div>
            )}

            {/* Hitos y llegada: solo national_admin, que es quien captura con el
                reporte del consignatario. El coordinador los ve en el timeline. */}
            {activeShipment && ["SHIPPED", "DELIVERED", "RECONCILED"].includes(activeShipment.status) && (
              <ShipmentIncidents
                shipmentId={activeShipment.id}
                pallets={activeShipment.pallets}
                isNationalAdmin={isNationalAdmin}
                status={activeShipment.status}
              />
            )}

            {activeShipment && (
              <ShipmentReception
                shipmentId={activeShipment.id}
                status={activeShipment.status}
                pallets={activeShipment.pallets}
                isNationalAdmin={isNationalAdmin}
                onDone={() => { fetchShipmentDetail(activeShipment.id); refetchShipments() }}
              />
            )}

            {isNationalAdmin && activeShipment && (
              <ShipmentMilestones
                shipmentId={activeShipment.id}
                status={activeShipment.status}
                onDone={() => { fetchShipmentDetail(activeShipment.id); refetchShipments() }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
