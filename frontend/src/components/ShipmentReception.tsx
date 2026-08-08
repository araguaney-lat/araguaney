"use client"

import { useEffect, useState } from "react"

import { reconcileReceptionAction } from "@/lib/shipment-actions"
import type {
  PalletDetailOut,
  ReceptionOut,
  ReceptionOutcome,
  ShipmentStatus,
} from "@/types"

const OUTCOME_LABELS: Record<ReceptionOutcome, string> = {
  RECEIVED: "Recibida",
  MISSING: "Faltante",
  DAMAGED: "Dañada",
  RETAINED_CUSTOMS: "Retenida en aduana",
}

interface Props {
  shipmentId: string
  status: ShipmentStatus
  pallets: PalletDetailOut[]
  isNationalAdmin: boolean
  onDone: () => void
}

/**
 * Checklist de recepción en destino.
 *
 * Se pre-llena como recibido y solo se marcan las excepciones: la merma es la
 * minoría, y un formulario que obligue a confirmar caja por caja lo que sí
 * llegó se llena mal justo cuando el envío es grande.
 */
export function ShipmentReception({
  shipmentId, status, pallets, isNationalAdmin, onDone,
}: Props) {
  const [reception, setReception] = useState<ReceptionOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [outcomes, setOutcomes] = useState<Record<string, ReceptionOutcome>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [consignee, setConsignee] = useState("")
  const [generalNote, setGeneralNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const yaRecibido = status === "RECONCILED"

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga o suscripción de datos intencional al montar o al cambiar de filtro; migrar a una capa de datos (SWR/react-query) se rastrea aparte
    if (!yaRecibido) { setLoading(false); return }
    fetch(`/api/shipments/${shipmentId}/reception`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setReception)
      .catch(() => setReception(null))
      .finally(() => setLoading(false))
  }, [shipmentId, yaRecibido])

  if (status !== "DELIVERED" && !yaRecibido) return null
  if (loading) return null

  // ── Ya registrada: se muestra el resultado ────────────────────────────────
  if (reception) {
    const excepciones = reception.lines.filter((l) => l.outcome !== "RECEIVED")
    const codigoDeCaja = (boxId: string) =>
      pallets.flatMap((p) => p.boxes).find((b) => b.id === boxId)?.code ?? boxId.slice(0, 8)

    return (
      <div className="border-t border-line pt-4 space-y-3">
        <p className="text-xs font-semibold text-fnt">Recepción en destino</p>

        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-tx">
            {reception.shrinkage.received} de {reception.shrinkage.total_boxes} cajas recibidas
          </span>
          <span className={reception.shrinkage.not_received > 0 ? "text-[var(--dRejT)]" : "text-mut"}>
            Merma: {reception.shrinkage.shrinkage_pct}%
          </span>
        </div>

        {reception.consignee_name && (
          <p className="text-xs text-mut">Recibió: {reception.consignee_name}</p>
        )}

        {excepciones.length > 0 && (
          <ul className="space-y-1">
            {excepciones.map((l) => (
              <li key={l.box_id} className="text-xs text-mut">
                <span className="font-mono text-tx">{codigoDeCaja(l.box_id)}</span>
                {" · "}{OUTCOME_LABELS[l.outcome]}
                {l.note && ` · ${l.note}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // La lectura es para ambos roles; registrar es de national_admin.
  if (!isNationalAdmin) return null

  const cajas = pallets.flatMap((p) => p.boxes)

  const registrar = async () => {
    setBusy(true)
    setError(null)

    const result = await reconcileReceptionAction(shipmentId, {
      exceptions: cajas
        .filter((b) => (outcomes[b.id] ?? "RECEIVED") !== "RECEIVED")
        .map((b) => ({
          box_id: b.id,
          outcome: outcomes[b.id],
          note: notes[b.id]?.trim() || undefined,
        })),
      pallet_weights: Object.entries(weights)
        .filter(([, v]) => v.trim() !== "")
        .map(([pallet_id, v]) => ({ pallet_id, gross_weight_kg: v })),
      consignee_name: consignee,
      notes: generalNote,
    })

    setBusy(false)
    if (result.error) return setError(result.error)
    onDone()
  }

  const conMerma = cajas.filter((b) => (outcomes[b.id] ?? "RECEIVED") !== "RECEIVED").length

  return (
    <div className="border-t border-line pt-4 space-y-4">
      <div>
        <p className="text-xs font-semibold text-fnt">Registrar recepción</p>
        <p className="text-xs text-mut mt-1">
          Todo se da por recibido. Marca solo lo que faltó, llegó dañado o quedó retenido.
        </p>
      </div>

      {pallets.map((pallet) => (
        <div key={pallet.id} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-tx">{pallet.code}</span>
            <input
              type="number"
              step="0.001"
              min="0"
              value={weights[pallet.id] ?? ""}
              onChange={(e) => setWeights({ ...weights, [pallet.id]: e.target.value })}
              placeholder="Peso recibido (kg)"
              className="w-44 rounded-lg border border-inpB bg-inp px-2 py-1 text-xs text-tx"
            />
            {pallet.gross_weight_kg != null && (
              <span className="text-xs text-fnt">Se despachó con {String(pallet.gross_weight_kg)} kg</span>
            )}
          </div>

          <ul className="space-y-1 pl-2">
            {pallet.boxes.map((box) => {
              const outcome = outcomes[box.id] ?? "RECEIVED"
              return (
                <li key={box.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-mut w-28">{box.code}</span>
                  <select
                    value={outcome}
                    onChange={(e) =>
                      setOutcomes({ ...outcomes, [box.id]: e.target.value as ReceptionOutcome })
                    }
                    className="rounded-lg border border-inpB bg-inp px-2 py-1 text-xs text-tx"
                  >
                    {(Object.keys(OUTCOME_LABELS) as ReceptionOutcome[]).map((o) => (
                      <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>
                    ))}
                  </select>
                  {outcome !== "RECEIVED" && (
                    <input
                      type="text"
                      value={notes[box.id] ?? ""}
                      onChange={(e) => setNotes({ ...notes, [box.id]: e.target.value })}
                      placeholder="Qué pasó"
                      className="flex-1 min-w-[10rem] rounded-lg border border-inpB bg-inp px-2 py-1 text-xs text-tx"
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={consignee}
          onChange={(e) => setConsignee(e.target.value)}
          placeholder="Quién recibió en destino"
          className="flex-1 min-w-[12rem] rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx"
        />
        <input
          type="text"
          value={generalNote}
          onChange={(e) => setGeneralNote(e.target.value)}
          placeholder="Nota del acta"
          className="flex-1 min-w-[12rem] rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx"
        />
      </div>

      {error && <p className="text-sm text-[var(--dRejT)]">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={registrar}
          disabled={busy}
          className="rounded-lg bg-[var(--gold)] px-3 py-2 text-sm font-medium text-[#3B2A00] hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Registrando…" : "Confirmar recepción"}
        </button>
        <span className="text-xs text-fnt">
          {conMerma === 0
            ? `${cajas.length} cajas, todas recibidas`
            : `${conMerma} de ${cajas.length} con novedad`}
        </span>
      </div>

      <p className="text-xs text-fnt">
        Se registra una sola vez. Una corrección posterior se hace con una incidencia.
      </p>
    </div>
  )
}
