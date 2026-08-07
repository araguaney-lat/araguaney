"use client"

import Link from "next/link"
import { useOfflineQueue } from "@/context/OfflineQueueContext"
import { useDict } from "@/context/DictionaryContext"

/* Contador de capturas pendientes (Fase 25, task 9).
 *
 * Una cola invisible es peor que no tener cola: quien captura cree que su
 * trabajo ya está en el servidor, cierra la aplicación y lo pierde sin
 * enterarse. Por eso el contador vive en el marco del panel y no en la página
 * de captura — se ve desde donde sea que esté trabajando esa persona. */

function pluralize(template: string, count: number): string {
  return template.replace("{count}", String(count))
}

export function PendingCapturesBadge() {
  const queue = useOfflineQueue()
  const dict = useDict()
  const t = dict.dashboard.offline_queue

  if (!queue) return null
  const { pending, needsAttention, needsLogin, syncing } = queue
  if (pending === 0 && needsAttention === 0) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-dDraftB bg-dDraftB px-4 py-3 text-sm text-dDraftT">
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full bg-dDraftT ${syncing ? "animate-pulse" : ""}`} />
        {pending > 0 && (
          <span>{pluralize(pending === 1 ? t.pending_one : t.pending_many, pending)}</span>
        )}
        {needsAttention > 0 && (
          <span className="text-dRejT">
            {pluralize(
              needsAttention === 1 ? t.attention_one : t.attention_many,
              needsAttention
            )}
          </span>
        )}
      </span>

      {/* La instrucción que de verdad importa, y la única que no depende del
          navegador: quedarse con la aplicación abierta hasta que llegue a cero. */}
      {pending > 0 && <span className="text-xs opacity-80">{t.keep_open}</span>}
      {needsLogin && <span className="text-xs text-dRejT">{t.session_expired}</span>}

      <Link
        href="/dashboard/intake/pending"
        className="ml-auto rounded-lg border border-dDraftT/40 px-3 py-1 text-xs font-medium hover:opacity-80"
      >
        {t.review_link}
      </Link>
    </div>
  )
}
