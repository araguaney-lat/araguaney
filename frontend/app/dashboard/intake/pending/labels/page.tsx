"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useDict } from "@/context/DictionaryContext"
import { useUrlSearchParam } from "@/hooks/useUrlSearchParam"
import { OfflineLabelSheet } from "@/components/OfflineLabelSheet"
import { listCaptures, subscribeToQueue } from "@/lib/offline/queue"
import type { QueuedCapture } from "@/lib/offline/types"

/* Hoja de etiquetas para lo capturado sin conexión (Fase 25, task 11).
 *
 * Se imprime desde el navegador y no desde el servidor a propósito: en el
 * sótano no hay servidor. Todo lo que necesita —el código apartado, el
 * producto, el lote, la caducidad— ya está en el dispositivo desde que se
 * encoló la captura. */

export default function OfflineLabelsPage() {
  const dict = useDict()
  const t = dict.dashboard.intake_labels

  const [captures, setCaptures] = useState<QueuedCapture[]>([])
  const only = useUrlSearchParam("capture")

  const load = useCallback(async () => {
    setCaptures(await listCaptures())
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga o suscripción de datos intencional al montar o al cambiar de filtro; migrar a una capa de datos (SWR/react-query) se rastrea aparte
    void load()
    return subscribeToQueue(() => void load())
  }, [load])

  const shown = captures.filter((c) => (only ? c.capture_id === only : true))
  const withCodes = shown.filter((c) => c.payload.boxes.some((b) => b.code))

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-6 print:hidden">
        <h1 className="text-xl font-semibold text-tx">{t.title}</h1>
        <p className="mt-1 text-sm text-mut">{t.subtitle}</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          disabled={withCodes.length === 0}
          className="rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-medium text-[#3B2A00] hover:opacity-90 disabled:opacity-60"
        >
          {t.print}
        </button>
        <Link href="/dashboard/intake/pending" className="text-sm text-fnt hover:text-tx">
          {t.back}
        </Link>
      </div>

      {withCodes.length === 0 ? (
        <div className="rounded-xl border border-cardB bg-card p-6 text-center text-sm text-mut print:hidden">
          {/* Una captura sin códigos no es un error: el bloque se agotó y se
              guardó igual. Sus etiquetas salen del PDF del servidor cuando
              vuelva la señal. */}
          {shown.length === 0 ? t.empty : t.empty_no_codes}
        </div>
      ) : (
        <OfflineLabelSheet captures={withCodes} />
      )}
    </div>
  )
}
