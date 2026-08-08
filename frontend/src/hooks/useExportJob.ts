"use client"

import { useCallback, useRef, useState } from "react"
import { startExportJobAction, pollExportJobAction } from "@/lib/export-actions"

export type ExportJobPhase = "idle" | "generating" | "done" | "error"

const POLL_INTERVAL_MS = 1500

// Shared client-side flow for the 6 async exports (Fase 12 tarea 15c):
// POST to start the job -> poll GET /v1/exports/{id} every ~1.5s -> navigate
// to the presigned download URL once DONE. Replaces the old synchronous
// fetch+base64+blob pattern used before generation moved to ARQ.
export function useExportJob() {
  const [phase, setPhase] = useState<ExportJobPhase>("idle")
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const start = useCallback((path: string) => {
    stop()
    setPhase("generating")
    setError(null)

    void (async () => {
      const started = await startExportJobAction(path)
      if (!started.ok) {
        setPhase("error")
        setError(started.error)
        return
      }

      timerRef.current = setInterval(async () => {
        const polled = await pollExportJobAction(started.jobId)
        if (!polled.ok) {
          stop()
          setPhase("error")
          setError(polled.error)
          return
        }
        if (polled.status === "DONE" && polled.downloadUrl) {
          stop()
          setPhase("done")
          window.location.href = polled.downloadUrl
        } else if (polled.status === "FAILED") {
          stop()
          setPhase("error")
          setError(polled.jobError ?? "La generación falló")
        }
        // PENDING / RUNNING -> keep polling
      }, POLL_INTERVAL_MS)
    })()
  }, [stop])

  // Limpia el error y vuelve a inactivo. Antes cada pantalla espejaba
  // `error` a un useState propio solo para poder cerrar el aviso; con esto el
  // aviso se deriva del hook y se cierra reseteándolo, sin estado duplicado.
  const reset = useCallback(() => {
    stop()
    setPhase("idle")
    setError(null)
  }, [stop])

  return { phase, error, start, reset, isBusy: phase === "generating" }
}
