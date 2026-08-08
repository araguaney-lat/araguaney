"use client" // Los error boundaries deben ser Client Components.

import { useEffect } from "react"

// Boundary de toda la aplicación bajo el root layout. Atrapa una excepción no
// controlada en el render de un segmento y ofrece reintentar sin recargar. En
// Next 16 el prop estable es `retry` (antes `reset`): reintenta el render del
// segmento fallido.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    // Sentry ya captura excepciones no controladas por su cuenta; esto deja
    // rastro en la consola del navegador para depurar en desarrollo.
    console.error(error)
  }, [error])

  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="max-w-md text-sm text-neutral-600">
        Ocurrió un error inesperado al mostrar esta página. Puede ser temporal;
        vuelve a intentarlo.
      </p>
      <button
        onClick={() => retry()}
        className="mt-2 rounded-lg bg-[var(--blue)] px-5 py-2.5 text-sm font-medium text-white"
      >
        Reintentar
      </button>
    </main>
  )
}
