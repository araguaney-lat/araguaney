"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { BrowserMultiFormatReader } from "@zxing/browser"
import type { IScannerControls } from "@zxing/browser"
import { useDict } from "@/context/DictionaryContext"

interface Props {
  onResult: (text: string) => void
  onClose: () => void
  label?: string
}

type StartError = "insecure" | "denied" | "not_found" | "unknown"

function classifyError(err: unknown): StartError {
  if (typeof err === "object" && err !== null && "name" in err) {
    const name = (err as { name: string }).name
    if (name === "NotAllowedError" || name === "SecurityError") return "denied"
    if (name === "NotFoundError" || name === "OverconstrainedError") return "not_found"
  }
  return "unknown"
}

export function CameraScanner({ onResult, onClose, label }: Props) {
  const dict = useDict()
  const t = dict.dashboard.scan

  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  // Serializes start/stop. `IScannerControls.stop()` nulls the <video> srcObject, so a
  // start that resolves late would blank a newer stream sharing the same element — which
  // is exactly what React's dev double-effect triggers: flash of camera, then black.
  const chainRef = useRef<Promise<unknown>>(Promise.resolve())
  const [error, setError] = useState<StartError | null>(null)
  const [attempt, setAttempt] = useState(0)

  const stop = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Cancelled by unmount (or by React's dev double-effect) before getUserMedia resolves.
    let cancelled = false
    setError(null)

    // getUserMedia only exists in a secure context (HTTPS or localhost). Accessing the
    // dev server over a LAN IP leaves it undefined, which would otherwise be a black screen.
    if (!navigator.mediaDevices?.getUserMedia) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- effect con efecto de navegador; el setState es parte de ese flujo, no un derivado del render
      setError("insecure")
      return
    }

    const started = chainRef.current.then(() => {
      if (cancelled) return null

      const reader = new BrowserMultiFormatReader()

      return reader
        .decodeFromVideoDevice(undefined, video, (result, err) => {
          if (result) {
            stop()
            onResult(result.getText())
            return
          }
          // NotFoundException fires on every frame without a code — expected, not an error.
          if (err && err.name !== "NotFoundException") {
            console.error(err)
          }
        })
        .then((controls) => {
          if (cancelled) {
            controls.stop()
            return null
          }
          controlsRef.current = controls
          return controls
        })
        .catch((err: unknown) => {
          if (cancelled) return null
          console.error(err)
          setError(classifyError(err))
          return null
        })
    })

    chainRef.current = started

    return () => {
      cancelled = true
      // The next start waits for this teardown, so it never races the previous stream.
      chainRef.current = started.then(stop)
    }
  }, [onResult, stop, attempt])

  const handleClose = () => {
    stop()
    onClose()
  }

  const errorMessage =
    error === "denied" ? t.permission_denied
    : error === "not_found" ? t.no_camera
    : error === "insecure" ? t.camera_insecure
    : error ? t.camera_error
    : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 bg-black">
        <p className="text-sm text-white">{label ?? t.camera_label}</p>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full bg-card/20 px-3 py-1 text-sm text-white hover:bg-card/30"
        >
          {t.cancel}
        </button>
      </div>

      <div className="relative flex-1">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
        />
        {errorMessage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm text-white">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="rounded-lg bg-white/15 px-4 py-2 text-sm text-white hover:bg-white/25"
            >
              {t.camera_retry}
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-56 w-56 border-2 border-white/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
          </div>
        )}
      </div>
    </div>
  )
}
