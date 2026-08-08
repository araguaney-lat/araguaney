"use client"

import { useCallback, useSyncExternalStore } from "react"

// Estado de "colapsado" persistido en localStorage, leído con la API que React
// recomienda para fuentes externas. Antes cada sidebar lo hacía con `useState`
// + un `useEffect` que leía localStorage tras montar (más un flag `mounted`
// para evitar el salto de layout en la hidratación). `useSyncExternalStore`
// hace las dos cosas de raíz: el snapshot de servidor devuelve "expandido", así
// que el primer render coincide con el HTML del servidor y no hay mismatch, y
// después lee el valor real sin estado intermedio.
//
// La notificación en la misma pestaña usa un evento propio por clave: el evento
// `storage` del navegador solo se dispara entre pestañas distintas, no en la
// que escribe.
export function useCollapsiblePanel(storageKey: string): readonly [boolean, () => void] {
  const eventName = `panel-toggle:${storageKey}`

  const subscribe = useCallback(
    (onChange: () => void) => {
      window.addEventListener("storage", onChange)
      window.addEventListener(eventName, onChange)
      return () => {
        window.removeEventListener("storage", onChange)
        window.removeEventListener(eventName, onChange)
      }
    },
    [eventName],
  )

  const collapsed = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(storageKey) === "true",
    () => false,
  )

  const toggle = useCallback(() => {
    const next = localStorage.getItem(storageKey) !== "true"
    localStorage.setItem(storageKey, String(next))
    window.dispatchEvent(new Event(eventName))
  }, [storageKey, eventName])

  return [collapsed, toggle] as const
}
