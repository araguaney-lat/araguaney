import type { CreateIntakePayload } from "@/lib/actions"
import { offlineDB } from "./db"
import { releaseCodes, forgetCodes } from "./box-codes"
import type { CaptureStatus, CaptureSummary, QueuedCapture } from "./types"

/* Cola de capturas en el dispositivo (Fase 25, task 7).
 *
 * La llave de idempotencia se genera **al encolar**, antes del primer intento,
 * y se conserva: todo reintento lleva la misma, así que una respuesta perdida
 * en el sótano no duplica inventario cuando alguien sale a la calle y la cola
 * se vacía. Esa es la pieza que hace que encolar sea seguro; sin ella, encolar
 * convertiría "se perdió una captura" en "hay inventario fantasma". */

/** Tras esto una captura deja de reintentarse sola y pasa a revisión humana.
 * Reintentar para siempre gasta batería, gasta datos y esconde el problema
 * detrás de un contador que nunca baja. */
export const MAX_ATTEMPTS = 5

/** Espera creciente entre intentos, en minutos. El último valor se repite. */
const BACKOFF_MINUTES = [0, 1, 5, 15, 60]

const listeners = new Set<() => void>()

/** Un solo canal por pestaña. Un `BroadcastChannel` no recibe lo que él mismo
 * publica, así que compartirlo deja el reparto limpio: los oyentes de esta
 * pestaña se llaman directamente y el canal solo lleva el aviso a las otras. */
let channel: BroadcastChannel | null = null

function ensureChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null
  if (!channel) {
    channel = new BroadcastChannel("araguaney-queue")
    channel.onmessage = () => {
      for (const listener of listeners) listener()
    }
  }
  return channel
}

/** Avisa a esta pestaña y a las demás. Una persona puede tener el formulario
 * en una y la lista de pendientes en otra, y un contador que miente en una de
 * las dos es peor que no tenerlo. */
function notify(): void {
  for (const listener of listeners) listener()
  ensureChannel()?.postMessage("changed")
}

export function subscribeToQueue(listener: () => void): () => void {
  listeners.add(listener)
  ensureChannel()
  return () => listeners.delete(listener)
}

function backoff(attempts: number): number {
  const minutes = BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length - 1)]
  return Date.now() + minutes * 60_000
}

/** Encola una captura.
 *
 * La llave llega de fuera porque los códigos de caja se apartan a su nombre
 * antes de escribir nada: si se generara aquí, habría que apartar los códigos
 * después y una captura a medio encolar podría quedarse sin ellos. */
export async function enqueueCapture(args: {
  payload: CreateIntakePayload
  userId: string
  codes: string[]
  summary: CaptureSummary
  captureId: string
}): Promise<string> {
  const db = await offlineDB()
  if (!db) throw new Error("offline_storage_unavailable")

  const captureId = args.captureId
  const capture: QueuedCapture = {
    capture_id: captureId,
    user_id: args.userId,
    payload: { ...args.payload, capture_id: captureId },
    codes: args.codes,
    summary: args.summary,
    created_at: Date.now(),
    attempts: 0,
    status: "PENDING",
    last_error: null,
    retry_after: 0,
  }

  await db.put("captures", capture)
  notify()
  return captureId
}

export async function listCaptures(): Promise<QueuedCapture[]> {
  const db = await offlineDB()
  if (!db) return []
  const all = await db.getAll("captures")
  return all.sort((a, b) => b.created_at - a.created_at)
}

/** Capturas de esta persona listas para intentarse ahora.
 *
 * Filtra por usuario a propósito: la cola vive en el dispositivo y el
 * dispositivo se comparte. Enviar la captura de alguien con la sesión de la
 * siguiente persona que entre la atribuiría a otro operador y, si son de
 * centros distintos, a otro centro. */
export async function dueCaptures(userId: string): Promise<QueuedCapture[]> {
  const db = await offlineDB()
  if (!db) return []
  const pending = await db.getAllFromIndex("captures", "by_status", "PENDING")
  return pending
    .filter((c) => c.user_id === userId && c.retry_after <= Date.now())
    .sort((a, b) => a.created_at - b.created_at)
}

/** Cuántas capturas siguen esperando. Es el número del contador. */
export async function pendingCount(): Promise<number> {
  const db = await offlineDB()
  if (!db) return 0
  return db.countFromIndex("captures", "by_status", "PENDING")
}

/** Cuántas esperan a que una persona decida. */
export async function needsAttentionCount(): Promise<number> {
  const db = await offlineDB()
  if (!db) return 0
  const [rejected, review] = await Promise.all([
    db.countFromIndex("captures", "by_status", "REJECTED"),
    db.countFromIndex("captures", "by_status", "NEEDS_REVIEW"),
  ])
  return rejected + review
}

/** La captura llegó al servidor: sale de la cola.
 *
 * Se borra en vez de marcarse como enviada porque ya vive en el servidor, y
 * dejar una copia local invitaría a leer dos verdades sobre el mismo inventario. */
export async function markSynced(capture: QueuedCapture): Promise<void> {
  const db = await offlineDB()
  if (!db) return
  await forgetCodes(capture.codes)
  await db.delete("captures", capture.capture_id)
  notify()
}

/** Falló por algo que puede arreglarse solo (sin red, servidor caído, límite
 * de peticiones). Se reintenta más tarde; tras `MAX_ATTEMPTS` pasa a revisión. */
export async function markRetry(
  capture: QueuedCapture,
  error: string
): Promise<void> {
  const db = await offlineDB()
  if (!db) return

  const attempts = capture.attempts + 1
  const agotada = attempts >= MAX_ATTEMPTS
  await db.put("captures", {
    ...capture,
    attempts,
    last_error: error,
    status: agotada ? "NEEDS_REVIEW" : "PENDING",
    retry_after: backoff(attempts),
  })
  notify()
}

/** El servidor la rechazó por una regla de negocio. Reintentar daría lo mismo,
 * así que queda visible para que una persona la corrija o la descarte —nunca se
 * borra sola, que es como se pierde una donación sin que nadie se entere. */
export async function markRejected(
  capture: QueuedCapture,
  error: string
): Promise<void> {
  const db = await offlineDB()
  if (!db) return

  // Sus códigos NO vuelven al bloque. El servidor no llegó a marcarlos usados,
  // así que técnicamente están libres, pero la etiqueta con ese número ya está
  // pegada a una caja física. Devolverlos al bloque los pondría en una segunda
  // caja, y dos cajas con la misma etiqueta es el error que el manifiesto
  // declara como un solo bulto. Se sueltan solo al descartar la captura.
  await db.put("captures", {
    ...capture,
    attempts: capture.attempts + 1,
    last_error: error,
    status: "REJECTED" as CaptureStatus,
  })
  notify()
}

/** Vuelve a poner en cola algo que estaba esperando a una persona. */
export async function retryCapture(captureId: string): Promise<void> {
  const db = await offlineDB()
  if (!db) return
  const capture = await db.get("captures", captureId)
  if (!capture) return
  await db.put("captures", {
    ...capture,
    status: "PENDING",
    attempts: 0,
    retry_after: 0,
  })
  notify()
}

/** Descarta una captura. Solo desde la pantalla de revisión y con
 * confirmación: es la única forma de que algo capturado desaparezca, y tiene
 * que ser una decisión explícita de una persona. */
export async function discardCapture(captureId: string): Promise<void> {
  const db = await offlineDB()
  if (!db) return
  const capture = await db.get("captures", captureId)
  if (capture) await releaseCodes(capture.codes)
  await db.delete("captures", captureId)
  notify()
}
