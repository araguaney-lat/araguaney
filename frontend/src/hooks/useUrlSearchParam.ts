"use client"

import { useCallback, useSyncExternalStore } from "react"

// Lee un parámetro de la query (`?nombre=...`) sin `useState` + `useEffect` y
// sin `useSearchParams`. Se evita `useSearchParams` a propósito: fuerza un
// límite de Suspense y un render de cliente en páginas que no lo necesitan
// (p. ej. login). `useSyncExternalStore` lee el valor real desde el primer
// render de cliente —sin el parpadeo de leerlo en un effect— y devuelve `null`
// en el servidor, donde no hay `window`.
//
// La query solo cambia al navegar, momento en que el componente se remonta, así
// que la suscripción no necesita escuchar nada: basta el snapshot.
export function useUrlSearchParam(name: string): string | null {
  const getSnapshot = useCallback(
    () => new URLSearchParams(window.location.search).get(name),
    [name],
  )
  return useSyncExternalStore(
    () => () => {},
    getSnapshot,
    () => null,
  )
}
