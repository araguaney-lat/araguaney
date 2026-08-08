"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useDict } from "@/context/DictionaryContext"
import { useScannerGun } from "@/hooks/useScannerGun"

// @zxing/browser is only needed when the camera scanner actually opens.
const CameraScanner = dynamic(
  () => import("@/components/CameraScanner").then((mod) => mod.CameraScanner),
  { ssr: false }
)

export default function ScanPage() {
  const dict = useDict()
  const t = dict.dashboard.scan

  const router = useRouter()
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResult = useCallback((text: string) => {
    setScanning(false)
    setError(null)

    try {
      const url = new URL(text)
      const path = url.pathname
      if (path.startsWith("/d/")) {
        router.push(`/dashboard/donations/${path.slice(3)}`)
        return
      }
      if (path.startsWith("/b/") || path.startsWith("/p/")) {
        router.push(path)
        return
      }
    } catch {
      // not a URL — treat as bare code
    }

    // Los códigos se generan en mayúsculas (`secrets.token_urlsafe(6).upper()`),
    // así que teclear en minúsculas es un dedazo, no otro código.
    const code = text.trim().toUpperCase()

    if (code.startsWith("DN-")) {
      // Donación pre-registrada: su ficha operativa vive en el panel.
      router.push(`/dashboard/donations/${code}`)
    } else if (code.startsWith("TM-")) {
      // La tarima no tiene página propia; /qr resuelve caja y tarima por igual.
      router.push(`/qr/${code}`)
    } else {
      router.push(`/b/${code}`)
    }
  }, [router])

  // Una pistola lectora dispara sin que nadie toque la pantalla. Se desactiva
  // con la cámara abierta: ahí el código entra por otro camino y atenderlo dos
  // veces abriría dos fichas.
  useScannerGun(handleResult, !scanning)

  return (
    <div className="max-w-sm mx-auto pt-8 px-4 text-center space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-tx">{t.title}</h1>
        <p className="text-sm text-mut mt-1">{t.subtitle_detail}</p>
      </div>

      <button
        type="button"
        onClick={() => { setError(null); setScanning(true) }}
        className="w-full rounded-xl bg-[var(--gold)] py-4 text-sm font-medium text-[#3B2A00] hover:opacity-90"
      >
        {t.open_camera}
      </button>

      {error && (
        <p className="text-sm text-[var(--dRejT)]">{error}</p>
      )}

      <p className="text-xs text-fnt">{t.manual_label}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const code = (e.currentTarget.elements.namedItem("code") as HTMLInputElement).value.trim()
          if (code) handleResult(code)
        }}
        className="flex gap-2"
      >
        <input
          name="code"
          type="text"
          // Enfocado al abrir: una pistola escribe donde esté el cursor, y en
          // esta pantalla no hay nada más que escribir.
          autoFocus
          placeholder={t.code_placeholder}
          className="flex-1 rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
        />
        <button
          type="submit"
          className="rounded-lg bg-chip px-4 py-2 text-sm font-medium text-tx hover:bg-card2"
        >
          {t.go}
        </button>
      </form>

      {scanning && (
        <CameraScanner
          onResult={handleResult}
          onClose={() => setScanning(false)}
          label={t.camera_label}
        />
      )}
    </div>
  )
}
