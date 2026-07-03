interface TimelineEvent {
  from_status: string | null
  to_status: string
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
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s
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
          const isLast = i === events.length - 1

          return (
            <li key={i} className="relative">
              {/* Dot */}
              <div
                className={`absolute -left-6 top-0.5 h-4 w-4 rounded-full border-2 ${
                  isError
                    ? "border-[var(--dRejT)] bg-[var(--dRejB)]"
                    : isLast
                    ? "border-[var(--gold)] bg-[var(--gold)]"
                    : "border-cardB bg-card"
                }`}
              >
                {isLast && !isError && (
                  <svg className="h-full w-full text-[#3B2A00] p-0.5" viewBox="0 0 12 12" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6 7.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              <div>
                <p className={`text-sm font-medium leading-tight ${isError ? "text-[var(--dRejT)]" : "text-tx"}`}>
                  {statusLabel(e.to_status)}
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
