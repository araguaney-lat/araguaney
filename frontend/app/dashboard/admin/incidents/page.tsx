"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { INCIDENT_TYPE_LABELS } from "@/components/ShipmentIncidents"
import { resolveIncidentAction } from "@/lib/incident-actions"
import { apiGet } from "@/lib/query"
import type { IncidentOut } from "@/types"

/**
 * Bandeja de incidencias.
 *
 * Existe porque una incidencia vista solo desde el detalle de su envío se
 * pierde: nadie recorre envío por envío buscando pendientes. Por defecto lista
 * las abiertas, que es lo único accionable.
 */
export default function IncidentsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<"OPEN" | "RESOLVED" | "">("OPEN")
  const [notes, setNotes] = useState<Record<string, string>>({})

  const incidentsQuery = useQuery({
    queryKey: ["incidents", filter],
    queryFn: () => apiGet<IncidentOut[]>(`/api/incidents${filter ? `?status=${filter}` : ""}`),
  })
  const incidents = incidentsQuery.data ?? []
  const loading = incidentsQuery.isPending

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await resolveIncidentAction(id, notes[id] ?? "")
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incidents"] }),
  })
  const busy = resolveMutation.isPending ? (resolveMutation.variables ?? null) : null
  const error = resolveMutation.error instanceof Error ? resolveMutation.error.message : null

  const resolver = (id: string) => resolveMutation.mutate(id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-tx">Incidencias</h1>
        <p className="text-sm text-mut mt-1">
          Faltantes, daños, retenciones y diferencias de peso de los envíos.
        </p>
      </div>

      <div className="flex gap-2">
        {([["OPEN", "Abiertas"], ["RESOLVED", "Resueltas"], ["", "Todas"]] as const).map(
          ([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === value
                  ? "bg-[var(--gold)] text-[#3B2A00] border-[var(--gold)]"
                  : "bg-card text-mut border-cardB hover:border-sec"
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {error && <p className="text-sm text-[var(--dRejT)]">{error}</p>}

      {loading ? (
        <p className="text-sm text-mut">Cargando…</p>
      ) : incidents.length === 0 ? (
        <p className="text-sm text-mut">
          {filter === "OPEN" ? "Nada pendiente." : "Sin incidencias."}
        </p>
      ) : (
        <ul className="space-y-3">
          {incidents.map((inc) => (
            <li key={inc.id} className="rounded-xl border border-cardB bg-card p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-mut">
                  {INCIDENT_TYPE_LABELS[inc.type]}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    inc.status === "OPEN"
                      ? "bg-dDraftB text-dDraftT"
                      : "bg-dSealB text-dSealT"
                  }`}
                >
                  {inc.status === "OPEN" ? "Abierta" : "Resuelta"}
                </span>
                <time className="text-xs text-fnt">
                  {new Date(inc.created_at).toLocaleDateString("es-MX", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </time>
              </div>

              <p className="text-sm text-tx">{inc.description}</p>

              {inc.resolution_note && (
                <p className="text-xs text-mut">Resolución: {inc.resolution_note}</p>
              )}

              {inc.status === "OPEN" && (
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={notes[inc.id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [inc.id]: e.target.value })}
                    placeholder="Cómo se resolvió"
                    className="flex-1 min-w-[14rem] rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx"
                  />
                  <button
                    type="button"
                    onClick={() => resolver(inc.id)}
                    disabled={busy === inc.id}
                    className="rounded-lg bg-[var(--gold)] px-3 py-2 text-sm font-medium text-[#3B2A00] hover:opacity-90 disabled:opacity-50"
                  >
                    {busy === inc.id ? "Resolviendo…" : "Resolver"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
