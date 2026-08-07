"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { useSession } from "next-auth/react"
import { refreshCatalog, catalogIsStale, countCatalog } from "@/lib/offline/catalog-cache"
import { topUpCodes, availableCodes } from "@/lib/offline/box-codes"
import { needsAttentionCount, pendingCount, subscribeToQueue } from "@/lib/offline/queue"
import { syncQueue } from "@/lib/offline/sync"

/* Estado de la captura sin conexión, compartido por todo el panel (Fase 25,
 * tasks 8 y 9).
 *
 * Vive en el layout y no en la página de captura porque el contador tiene que
 * seguir visible después de capturar: quien acaba de guardar tres cajas se va a
 * otra pantalla y la promesa de la fase —"nada se pierde"— solo se sostiene si
 * puede ver desde cualquier sitio que la cola bajó a cero. */

interface OfflineQueueValue {
  /** Capturas esperando a irse. Es el número del contador. */
  pending: number
  /** Capturas que ya no se reintentan solas y esperan a una persona. */
  needsAttention: number
  /** Productos guardados en el dispositivo. Cero significa que hoy no se puede
   * capturar sin señal. */
  catalogSize: number
  /** Códigos de caja apartados y sin gastar. */
  codesLeft: number
  /** La sesión caducó con la cola llena: no se pierde nada, pero hay que
   * volver a entrar para que se vaya. */
  needsLogin: boolean
  syncing: boolean
  /** Fuerza una tanda ahora (botón "sincronizar" de la pantalla de revisión). */
  syncNow: () => Promise<void>
  /** Relee los contadores tras encolar o descartar algo. */
  refresh: () => Promise<void>
}

const OfflineQueueContext = createContext<OfflineQueueValue | null>(null)

/** Cada cuánto se intenta la cola mientras la pestaña está a la vista. Sin
 * esto, alguien que sale del sótano con la aplicación ya abierta y quieta no
 * dispararía ningún evento. */
const POLL_MS = 2 * 60_000

export function OfflineQueueProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ""
  const userId = session?.userId ?? ""
  const centerId = session?.centerId ?? ""

  const [pending, setPending] = useState(0)
  const [needsAttention, setNeedsAttention] = useState(0)
  const [catalogSize, setCatalogSize] = useState(0)
  const [codesLeft, setCodesLeft] = useState(0)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    const [p, a, c, k] = await Promise.all([
      pendingCount(),
      needsAttentionCount(),
      countCatalog(),
      centerId ? availableCodes(centerId) : Promise.resolve(0),
    ])
    setPending(p)
    setNeedsAttention(a)
    setCatalogSize(c)
    setCodesLeft(k)
  }, [centerId])

  const syncNow = useCallback(async () => {
    if (!token || !userId) return
    setSyncing(true)
    try {
      const outcome = await syncQueue(token, userId)
      setNeedsLogin(outcome.needsLogin)
    } finally {
      setSyncing(false)
      await refresh()
    }
  }, [token, userId, refresh])

  /** Lo que hay que tener descargado antes de bajar al sótano. Se hace con
   * señal, que es el único momento en que se puede. */
  const prepare = useCallback(async () => {
    if (!token) return
    try {
      if (await catalogIsStale()) {
        const res = await fetch("/api/campaigns/mine")
        const campaigns: { id: string }[] = res.ok ? await res.json() : []
        await refreshCatalog(campaigns.map((c) => c.id))
      }
      // El national_admin elige centro al capturar, así que un bloque de
      // códigos suyo no tendría a qué centro pertenecer. La captura sin
      // conexión es de quien opera un centro.
      if (centerId) await topUpCodes(token, centerId)
    } catch {
      // Preparar es oportunista: si falla, la aplicación sigue funcionando en
      // línea exactamente igual que antes.
    }
    await refresh()
  }, [token, centerId, refresh])

  // Contadores al vuelo: los cambia esta pestaña o cualquier otra.
  useEffect(() => {
    void refresh()
    return subscribeToQueue(() => void refresh())
  }, [refresh])

  // Disparadores de sincronización. Ninguno depende de Background Sync (ver el
  // razonamiento en `lib/offline/sync.ts`).
  useEffect(() => {
    if (!token || !userId) return

    void prepare()
    void syncNow()

    const onOnline = () => {
      void prepare()
      void syncNow()
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncNow()
    }

    window.addEventListener("online", onOnline)
    document.addEventListener("visibilitychange", onVisible)
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void syncNow()
    }, POLL_MS)

    return () => {
      window.removeEventListener("online", onOnline)
      document.removeEventListener("visibilitychange", onVisible)
      clearInterval(timer)
    }
  }, [token, userId, prepare, syncNow])

  // Cerrar la pestaña con capturas dentro es la forma más fácil de perder
  // trabajo sin enterarse: el aviso del navegador es lo único que lo frena.
  const pendingRef = useRef(0)
  pendingRef.current = pending
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pendingRef.current > 0) e.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [])

  return (
    <OfflineQueueContext.Provider
      value={{
        pending,
        needsAttention,
        catalogSize,
        codesLeft,
        needsLogin,
        syncing,
        syncNow,
        refresh,
      }}
    >
      {children}
    </OfflineQueueContext.Provider>
  )
}

/** Devuelve `null` fuera del panel: las páginas públicas no tienen cola. */
export function useOfflineQueue(): OfflineQueueValue | null {
  return useContext(OfflineQueueContext)
}
