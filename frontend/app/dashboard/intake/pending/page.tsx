"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useDict } from "@/context/DictionaryContext"
import { useOfflineQueue } from "@/context/OfflineQueueContext"
import {
  discardCapture,
  listCaptures,
  retryCapture,
  subscribeToQueue,
  MAX_ATTEMPTS,
} from "@/lib/offline/queue"
import type { QueuedCapture } from "@/lib/offline/types"

/* Capturas que no llegaron al servidor (Fase 25, tasks 9 y 10).
 *
 * Existe para que nada desaparezca en silencio. Una captura que el servidor
 * rechaza —una caducidad demasiado corta que el dispositivo no pudo validar
 * sin catálogo de reglas, un producto controlado, una campaña que ya cerró—
 * termina aquí con el motivo que dio el servidor, y espera a que una persona
 * decida. Descartar es la única forma de que algo capturado se borre, y es
 * siempre una decisión explícita. */

function formatDate(ms: number): string {
  // Sin locale explícito: el del dispositivo, que es el del turno de quien
  // está mirando la pantalla.
  return new Date(ms).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function PendingCapturesPage() {
  const dict = useDict()
  const t = dict.dashboard.intake_pending
  const tq = dict.dashboard.offline_queue
  const queue = useOfflineQueue()

  const [captures, setCaptures] = useState<QueuedCapture[]>([])
  const [confirming, setConfirming] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setCaptures(await listCaptures())
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    return subscribeToQueue(() => void load())
  }, [load])

  const onRetry = async (captureId: string) => {
    await retryCapture(captureId)
    await queue?.syncNow()
  }

  const onDiscard = async (captureId: string) => {
    await discardCapture(captureId)
    setConfirming(null)
    await queue?.refresh()
  }

  const statusLabel = (capture: QueuedCapture): { text: string; className: string } => {
    if (capture.status === "REJECTED") {
      return { text: t.status_rejected, className: "bg-dRejB text-dRejT" }
    }
    if (capture.status === "NEEDS_REVIEW") {
      return { text: t.status_needs_review, className: "bg-dRejB text-dRejT" }
    }
    return { text: t.status_pending, className: "bg-dDraftB text-dDraftT" }
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-tx">{t.title}</h1>
        <p className="mt-1 text-sm text-mut">{t.subtitle}</p>
      </div>

      {/* Qué hay descargado. Es lo que decide si hoy se puede capturar sin
          señal, y solo se puede arreglar mientras haya conexión. */}
      {queue && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-cardB bg-card p-3">
            <p className="text-xs text-mut">{t.ready_catalog}</p>
            <p className="text-lg font-semibold text-tx">{queue.catalogSize}</p>
          </div>
          <div className="rounded-xl border border-cardB bg-card p-3">
            <p className="text-xs text-mut">{t.ready_codes}</p>
            <p className="text-lg font-semibold text-tx">{queue.codesLeft}</p>
          </div>
          <div className="rounded-xl border border-cardB bg-card p-3">
            <p className="text-xs text-mut">{t.ready_pending}</p>
            <p className="text-lg font-semibold text-tx">{queue.pending}</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => queue?.syncNow()}
          disabled={queue?.syncing}
          className="rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-medium text-[#3B2A00] hover:opacity-90 disabled:opacity-60"
        >
          {queue?.syncing ? t.syncing : t.sync_now}
        </button>
        {/* La etiqueta se pega en el andén, sobre una caja que se acaba de
            cerrar. Si no sale ahora no sale nunca. */}
        <Link
          href="/dashboard/intake/pending/labels"
          className="rounded-lg border border-cardB px-4 py-2 text-sm font-medium text-tx hover:bg-card2"
        >
          {t.print_labels}
        </Link>
        {queue?.needsLogin && <span className="text-xs text-dRejT">{tq.session_expired}</span>}
      </div>

      {loading ? (
        <p className="text-sm text-fnt">{t.loading}</p>
      ) : captures.length === 0 ? (
        <div className="rounded-xl border border-cardB bg-card p-6 text-center">
          <p className="text-sm text-mut">{t.empty}</p>
          <Link href="/dashboard/intake/new" className="mt-2 inline-block text-sm text-fnt hover:text-tx">
            {t.empty_cta}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {captures.map((capture) => {
            const status = statusLabel(capture)
            return (
              <li key={capture.capture_id} className="rounded-xl border border-cardB bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-tx">{capture.summary.campaign_name}</p>
                    <p className="text-xs text-mut">
                      {formatDate(capture.created_at)}
                      {" · "}
                      {t.attempts.replace("{n}", String(capture.attempts)).replace("{max}", String(MAX_ATTEMPTS))}
                    </p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.text}
                  </span>
                </div>

                <ul className="mt-3 space-y-1 border-t border-cardB pt-3">
                  {capture.summary.boxes.map((box, i) => (
                    <li key={i} className="text-xs text-mut">
                      · {box.product_name} — {box.quantity} {box.unit}
                    </li>
                  ))}
                </ul>

                {capture.last_error && (
                  <p className="mt-3 rounded-lg bg-dRejB px-3 py-2 text-xs text-dRejT">
                    {capture.last_error}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {capture.payload.boxes.some((b) => b.code) && (
                    <Link
                      href={`/dashboard/intake/pending/labels?capture=${capture.capture_id}`}
                      className="text-xs text-fnt hover:text-tx"
                    >
                      {t.print_labels_one}
                    </Link>
                  )}
                </div>

                {capture.status !== "PENDING" && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onRetry(capture.capture_id)}
                      className="rounded-lg border border-cardB px-3 py-1.5 text-xs font-medium text-tx hover:bg-card2"
                    >
                      {t.action_retry}
                    </button>
                    {confirming === capture.capture_id ? (
                      <>
                        <span className="text-xs text-dRejT">{t.discard_confirm}</span>
                        <button
                          type="button"
                          onClick={() => onDiscard(capture.capture_id)}
                          className="rounded-lg bg-dRejB px-3 py-1.5 text-xs font-medium text-dRejT"
                        >
                          {t.discard_yes}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="text-xs text-fnt hover:text-tx"
                        >
                          {t.discard_no}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(capture.capture_id)}
                        className="text-xs text-[var(--dRejT)] hover:opacity-80"
                      >
                        {t.action_discard}
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
