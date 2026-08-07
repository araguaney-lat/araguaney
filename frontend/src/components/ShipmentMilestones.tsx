"use client"

import { useState } from "react"

import { MILESTONE_LABELS } from "@/components/StatusTimeline"
import { addMilestoneAction, markDeliveredAction } from "@/lib/shipment-actions"
import { SHIPMENT_MILESTONES, type ShipmentStatus } from "@/types"

/** Estados en los que el envío ya salió del centro y admite hitos. */
const POST_DISPATCH: ShipmentStatus[] = ["SHIPPED", "DELIVERED", "RECONCILED"]

interface Props {
  shipmentId: string
  status: ShipmentStatus
  onDone: () => void
}

/**
 * Registro de hitos y de la llegada, para `national_admin`.
 *
 * Quien recibe en destino no tiene cuenta en el sistema: la administración
 * nacional captura con el reporte del consignatario, que llega por el canal que
 * la conectividad permita. Por eso la fecha es un campo y no el reloj del
 * servidor — el reporte casi siempre describe algo de ayer.
 */
export function ShipmentMilestones({ shipmentId, status, onDone }: Props) {
  const [milestone, setMilestone] = useState<string>(SHIPMENT_MILESTONES[0])
  const [occurredAt, setOccurredAt] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!POST_DISPATCH.includes(status)) return null

  const registrar = async () => {
    setBusy("milestone")
    setError(null)
    const result = await addMilestoneAction(
      shipmentId, milestone, note,
      // El input entrega hora local sin zona; se manda como ISO para que el
      // backend no tenga que adivinar.
      occurredAt ? new Date(occurredAt).toISOString() : undefined,
    )
    setBusy(null)
    if (result.error) return setError(result.error)
    setNote("")
    setOccurredAt("")
    onDone()
  }

  const marcarEntregado = async () => {
    setBusy("delivered")
    setError(null)
    const result = await markDeliveredAction(shipmentId, note)
    setBusy(null)
    if (result.error) return setError(result.error)
    setNote("")
    onDone()
  }

  return (
    <div className="border-t border-line pt-4 space-y-3">
      <p className="text-xs font-semibold text-fnt">Registrar avance</p>

      <div className="flex flex-wrap gap-2">
        <select
          value={milestone}
          onChange={(e) => setMilestone(e.target.value)}
          className="flex-1 min-w-[12rem] rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx"
        >
          {SHIPMENT_MILESTONES.map((m) => (
            <option key={m} value={m}>{MILESTONE_LABELS[m] ?? m}</option>
          ))}
        </select>

        <input
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          className="rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx"
          aria-label="Cuándo ocurrió"
        />
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (ej. vuelo AV-234, guía 1234)"
        className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={registrar}
          disabled={busy !== null}
          className="rounded-lg bg-chip px-3 py-2 text-sm font-medium text-tx hover:bg-card2 disabled:opacity-50"
        >
          {busy === "milestone" ? "Registrando…" : "Registrar hito"}
        </button>

        {/* La llegada sí cambia el estado, así que se separa del resto. */}
        {status === "SHIPPED" && (
          <button
            type="button"
            onClick={marcarEntregado}
            disabled={busy !== null}
            className="rounded-lg bg-[var(--gold)] px-3 py-2 text-sm font-medium text-[#3B2A00] hover:opacity-90 disabled:opacity-50"
          >
            {busy === "delivered" ? "Marcando…" : "Marcar como entregado"}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-[var(--dRejT)]">{error}</p>}

      <p className="text-xs text-fnt">
        Un hito deja constancia de dónde va el envío y no cambia su estado. La
        entrega sí: marca que llegó a destino.
      </p>
    </div>
  )
}
