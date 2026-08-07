"use client"

import { useCallback, useEffect, useState } from "react"

import { createIncidentAction, resolveIncidentAction } from "@/lib/incident-actions"
import type { IncidentOut, IncidentType, PalletDetailOut } from "@/types"

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  WEIGHT_DIFF: "Diferencia de peso",
  MISSING_BOX: "Caja faltante",
  DAMAGE: "Daño",
  CUSTOMS_RETENTION: "Retención en aduana",
  OTHER: "Otra",
}

interface Props {
  shipmentId: string
  pallets: PalletDetailOut[]
  isNationalAdmin: boolean
  status: string
}

/**
 * Incidencias del envío.
 *
 * La recepción abre las suyas sola; esta pantalla sirve para las que alguien
 * levanta a mano y para cerrarlas. Cerrar exige nota: sin ella, "resuelta" no
 * significa nada seis meses después.
 */
export function ShipmentIncidents({ shipmentId, pallets, isNationalAdmin, status }: Props) {
  const [incidents, setIncidents] = useState<IncidentOut[]>([])
  const [type, setType] = useState<IncidentType>("OTHER")
  const [description, setDescription] = useState("")
  const [target, setTarget] = useState("")
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/shipments/${shipmentId}/incidents`)
    if (res.ok) setIncidents(await res.json())
  }, [shipmentId])

  useEffect(() => { cargar() }, [cargar, status])

  const crear = async () => {
    if (!description.trim()) return setError("Describe qué pasó")
    setBusy("create")
    setError(null)
    const [kind, id] = target ? target.split(":") : []
    const result = await createIncidentAction(shipmentId, {
      type,
      description,
      pallet_id: kind === "pallet" ? id : undefined,
      box_id: kind === "box" ? id : undefined,
    })
    setBusy(null)
    if (result.error) return setError(result.error)
    setDescription("")
    setTarget("")
    cargar()
  }

  const resolver = async (id: string) => {
    setBusy(id)
    setError(null)
    const result = await resolveIncidentAction(id, notes[id] ?? "")
    setBusy(null)
    if (result.error) return setError(result.error)
    setNotes({ ...notes, [id]: "" })
    cargar()
  }

  const abiertas = incidents.filter((i) => i.status === "OPEN")
  const cerradas = incidents.filter((i) => i.status !== "OPEN")

  return (
    <div className="border-t border-line pt-4 space-y-3">
      <p className="text-xs font-semibold text-fnt">
        Incidencias{abiertas.length > 0 && ` · ${abiertas.length} abierta(s)`}
      </p>

      {incidents.length === 0 && (
        <p className="text-xs text-mut">Sin incidencias registradas.</p>
      )}

      {abiertas.map((inc) => (
        <div key={inc.id} className="rounded-lg border border-cardB bg-card p-3 space-y-2">
          <p className="text-sm text-tx">
            <span className="text-xs text-mut">{INCIDENT_TYPE_LABELS[inc.type]} · </span>
            {inc.description}
          </p>
          {isNationalAdmin && (
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={notes[inc.id] ?? ""}
                onChange={(e) => setNotes({ ...notes, [inc.id]: e.target.value })}
                placeholder="Cómo se resolvió"
                className="flex-1 min-w-[12rem] rounded-lg border border-inpB bg-inp px-2 py-1 text-xs text-tx"
              />
              <button
                type="button"
                onClick={() => resolver(inc.id)}
                disabled={busy === inc.id}
                className="rounded-lg bg-chip px-3 py-1 text-xs font-medium text-tx hover:bg-card2 disabled:opacity-50"
              >
                {busy === inc.id ? "…" : "Resolver"}
              </button>
            </div>
          )}
        </div>
      ))}

      {cerradas.map((inc) => (
        <div key={inc.id} className="text-xs text-mut">
          <span className="line-through">{inc.description}</span>
          {inc.resolution_note && <span className="text-fnt"> · {inc.resolution_note}</span>}
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-1">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as IncidentType)}
          className="rounded-lg border border-inpB bg-inp px-2 py-1 text-xs text-tx"
        >
          {(Object.keys(INCIDENT_TYPE_LABELS) as IncidentType[]).map((t) => (
            <option key={t} value={t}>{INCIDENT_TYPE_LABELS[t]}</option>
          ))}
        </select>

        {/* Acotar a una tarima o caja es opcional: a veces se sabe dónde pasó y
            a veces solo que pasó. */}
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded-lg border border-inpB bg-inp px-2 py-1 text-xs text-tx"
        >
          <option value="">Todo el envío</option>
          {pallets.map((p) => (
            <optgroup key={p.id} label={p.code}>
              <option value={`pallet:${p.id}`}>Tarima {p.code}</option>
              {p.boxes.map((b) => (
                <option key={b.id} value={`box:${b.id}`}>Caja {b.code}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué pasó"
          className="flex-1 min-w-[12rem] rounded-lg border border-inpB bg-inp px-2 py-1 text-xs text-tx"
        />

        <button
          type="button"
          onClick={crear}
          disabled={busy === "create"}
          className="rounded-lg bg-chip px-3 py-1 text-xs font-medium text-tx hover:bg-card2 disabled:opacity-50"
        >
          {busy === "create" ? "…" : "Levantar"}
        </button>
      </div>

      {error && <p className="text-sm text-[var(--dRejT)]">{error}</p>}
    </div>
  )
}
