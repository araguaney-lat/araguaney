"use client"

import { useSyncExternalStore } from "react"

// Suscripción al estado de red con la API que React recomienda para fuentes
// externas: `useSyncExternalStore` lee `navigator.onLine` sin el parpadeo de
// un `useState` + `useEffect` (que en el primer render muestra un valor y lo
// corrige en el effect) y sin arriesgar una fuga de listener. El snapshot de
// servidor asume "con conexión": en SSR no hay `navigator` y es el default sano.
function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}

export function ConnectivityBanner() {
  const online = useOnlineStatus()

  if (online) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dSealB bg-dSealB px-3 py-2 text-xs text-dSealT">
        <span className="h-2 w-2 rounded-full bg-dSealT" />
        Con conexión — lookups externos activos
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dDraftB bg-dDraftB px-3 py-2 text-xs text-dDraftT">
      <span className="h-2 w-2 rounded-full bg-dDraftT" />
      Sin conexión — solo puedes usar productos del catálogo existente
    </div>
  )
}
