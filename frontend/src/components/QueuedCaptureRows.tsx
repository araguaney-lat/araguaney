"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useDict } from "@/context/DictionaryContext"
import { listCaptures, subscribeToQueue } from "@/lib/offline/queue"
import type { QueuedCapture } from "@/lib/offline/types"

/* Las capturas encoladas, dentro de la lista de recepciones (Fase 25, task 9).
 *
 * La lista de recepciones la sirve el servidor, así que lo capturado sin señal
 * no aparece en ella: quien captura tres donaciones en el sótano y luego abre
 * la lista las ve vacías y vuelve a capturarlas. Estas filas cierran ese hueco
 * marcando explícitamente lo que existe solo en este dispositivo. */

export function QueuedCaptureRows() {
  const dict = useDict()
  const t = dict.dashboard.intake_pending
  const [captures, setCaptures] = useState<QueuedCapture[]>([])

  const load = useCallback(async () => {
    setCaptures(await listCaptures())
  }, [])

  useEffect(() => {
    void load()
    return subscribeToQueue(() => void load())
  }, [load])

  if (captures.length === 0) return null

  return (
    <ul className="mb-3 space-y-3">
      {captures.map((capture) => (
        <li
          key={capture.capture_id}
          className="rounded-xl border border-dashed border-dDraftB bg-card p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-tx">{capture.summary.campaign_name}</p>
              <p className="mt-0.5 text-xs text-mut">
                {capture.summary.boxes.length === 1
                  ? capture.summary.boxes[0].product_name
                  : capture.summary.boxes.map((b) => b.product_name).join(", ")}
              </p>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                capture.status === "PENDING"
                  ? "bg-dDraftB text-dDraftT"
                  : "bg-dRejB text-dRejT"
              }`}
            >
              {capture.status === "PENDING"
                ? t.status_pending
                : capture.status === "REJECTED"
                  ? t.status_rejected
                  : t.status_needs_review}
            </span>
          </div>
          {capture.status !== "PENDING" && (
            <Link
              href="/dashboard/intake/pending"
              className="mt-2 inline-block text-xs text-fnt hover:text-tx"
            >
              {t.title}
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}
