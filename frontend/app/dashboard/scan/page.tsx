"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CameraScanner } from "@/components/CameraScanner"

export default function ScanPage() {
  const router = useRouter()
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResult = useCallback((text: string) => {
    setScanning(false)
    setError(null)

    // Accept full URLs (e.g. https://araguaney.lat/b/ABC123) or bare codes
    try {
      const url = new URL(text)
      const path = url.pathname
      if (path.startsWith("/b/") || path.startsWith("/p/")) {
        router.push(path)
        return
      }
    } catch {
      // not a URL — treat as bare code
    }

    // Bare code: try box first, then pallet prefix heuristic
    // Box codes start with "B-", pallet codes start with "P-"
    if (text.startsWith("P-")) {
      router.push(`/p/${text}`)
    } else {
      router.push(`/b/${text}`)
    }
  }, [router])

  return (
    <div className="max-w-sm mx-auto pt-8 px-4 text-center space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Escanear QR</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Escanea el QR de una caja o tarima para ver su ficha.
        </p>
      </div>

      <button
        type="button"
        onClick={() => { setError(null); setScanning(true) }}
        className="w-full rounded-xl bg-zinc-900 py-4 text-sm font-medium text-white hover:bg-zinc-700"
      >
        📷 Abrir cámara
      </button>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <p className="text-xs text-zinc-400">
        También puedes escribir el código manualmente:
      </p>

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
          placeholder="B-XXXX o P-XXXX"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
        >
          Ir
        </button>
      </form>

      {scanning && (
        <CameraScanner
          onResult={handleResult}
          onClose={() => setScanning(false)}
          label="Apunta al QR de la caja o tarima"
        />
      )}
    </div>
  )
}
