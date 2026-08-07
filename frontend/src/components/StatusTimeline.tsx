interface TimelineEvent {
  from_status: string | null
  to_status: string
  // Presente solo en hitos logísticos (Fase 22): el evento no cambió el estado,
  // anotó algo que ocurrió en el camino.
  milestone?: string | null
  note: string | null
  ts: string
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Recibida",
  SEALED: "Sellada",
  SHIPPED: "Despachada",
  REJECTED: "Rechazada",
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  DELIVERED: "Entregada en destino",
  RECONCILED: "Recepción registrada",
}

export const MILESTONE_LABELS: Record<string, string> = {
  DEPARTED_WAREHOUSE: "Salió del depósito",
  ARRIVED_AIRPORT: "Llegó al aeropuerto",
  LOADED_AIRCRAFT: "Cargada al avión",
  DEPARTED_FLIGHT: "Despegó",
  ARRIVED_DESTINATION: "Llegó a destino",
  CUSTOMS_CLEARED: "Liberada en aduana",
  DELIVERED_CONSIGNEE: "Entregada al consignatario",
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s
}

function eventLabel(e: TimelineEvent): string {
  return e.milestone ? MILESTONE_LABELS[e.milestone] ?? e.milestone : statusLabel(e.to_status)
}

export function StatusTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-2 top-2 bottom-2 w-px bg-line" />

      <ol className="space-y-5">
        {events.map((e, i) => {
          const isError = e.to_status === "REJECTED"
          const isMilestone = Boolean(e.milestone)
          const isLast = i === events.length - 1

          return (
            <li key={i} className="relative">
              {/* Dot */}
              <div
                className={`absolute -left-6 rounded-full border-2 ${
                  isMilestone
                    ? // Un hito se ve más pequeño y hueco a propósito: no movió
                      // el estado, y el timeline debe distinguir de un vistazo
                      // "el envío cambió" de "el envío avanzó en el camino".
                      "top-1.5 h-2 w-2 border-line bg-card"
                    : isError
                    ? "top-0.5 h-4 w-4 border-[var(--dRejT)] bg-[var(--dRejB)]"
                    : isLast
                    ? "top-0.5 h-4 w-4 border-[var(--gold)] bg-[var(--gold)]"
                    : "top-0.5 h-4 w-4 border-cardB bg-card"
                }`}
              >
                {isLast && !isError && !isMilestone && (
                  <svg className="h-full w-full text-[#3B2A00] p-0.5" viewBox="0 0 12 12" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6 7.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              <div>
                <p className={`text-sm leading-tight ${
                  isError ? "font-medium text-[var(--dRejT)]"
                  : isMilestone ? "text-mut"
                  : "font-medium text-tx"
                }`}>
                  {eventLabel(e)}
                </p>
                {e.note && (
                  <p className="text-xs text-mut mt-0.5">{e.note}</p>
                )}
                <time className="text-xs text-fnt">
                  {new Date(e.ts).toLocaleString("es-MX", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
