import { apiFetch, ApiError } from "@/lib/api"
import {
  dueCaptures,
  markRejected,
  markRetry,
  markSynced,
} from "./queue"
import type { QueuedCapture } from "./types"

/* Sincronización de la cola (Fase 25, task 8).
 *
 * **Por qué no se usa Background Sync.** La API existe desde hace años y la
 * tentación de usarla es evidente: sincronizar con la aplicación cerrada. Al
 * verificar el soporte antes de escribir esto —que es lo que pedía la spec, en
 * vez de darlo por hecho— resulta que ningún Safari la implementa, ni en macOS
 * ni en iOS ni en iPadOS, y Firefox tampoco. Queda en los navegadores basados
 * en Chromium, cerca de tres cuartas partes del tráfico mundial y bastante
 * menos entre teléfonos de voluntariado.
 *
 * Eso obliga a tener igualmente el camino en primer plano, completo, para
 * quienes se quedan fuera. Y teniendo ese camino, añadir Background Sync
 * significaría **duplicar la cola dentro del service worker** —otra copia de la
 * clasificación de errores, otra del reintento, otra del consumo de códigos—
 * para adelantar un envío que igual va a ocurrir en cuanto alguien abra la
 * aplicación. Dos implementaciones de lo mismo es donde aparecen las
 * discrepancias que nadie reproduce.
 *
 * La instrucción a quien opera es la misma con o sin la API, y es la que hay
 * que enseñar: **al salir del sótano, abrir la aplicación y esperar a que el
 * contador llegue a cero.**
 *
 * Si algún día Safari la implementa, esto se reconsidera. Mientras tanto se
 * sincroniza al abrir la aplicación, al volver la conexión, al volver a primer
 * plano y cada pocos minutos mientras la pestaña esté visible. */

/** Espacio entre capturas dentro de una misma tanda.
 *
 * El endpoint de intake tiene límite por minuto. Una cola de veinte capturas
 * enviada de golpe se lo comería y el propio límite parecería una caída del
 * servidor. */
const GAP_MS = 400

export interface SyncOutcome {
  synced: number
  rejected: number
  retry: number
  /** La sesión caducó mientras la cola esperaba: hay que volver a entrar. La
   * cola no se toca, solo deja de intentarse. */
  needsLogin: boolean
}

const EMPTY: SyncOutcome = { synced: 0, rejected: 0, retry: 0, needsLogin: false }

/** Una tanda a la vez. Dos tandas en paralelo mandarían la misma captura dos
 * veces; el `capture_id` lo haría inofensivo en el servidor, pero gastaría
 * peticiones contra el límite por nada. */
let running = false

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Un error de red no trae estado: `fetch` simplemente falla. Es el caso
 * normal aquí, no la excepción. */
function isNetworkError(err: unknown): boolean {
  return !(err instanceof ApiError)
}

/** ¿El servidor dijo que no, o solo no pudo ahora?
 *
 * La diferencia decide si la captura se reintenta o espera a una persona, y es
 * la razón por la que el backend distingue "código ya usado" de un error de
 * integridad opaco: sin esa distinción, una captura que el servidor nunca va a
 * aceptar se reintentaría para siempre. */
function isBusinessRejection(err: ApiError): boolean {
  return err.status >= 400 && err.status < 500 && err.status !== 429 && err.status !== 401
}

type SendResult = "synced" | "rejected" | "retry" | "throttled" | "login"

async function sendOne(capture: QueuedCapture, token: string): Promise<SendResult> {
  try {
    await apiFetch("/v1/intakes", {
      method: "POST",
      body: JSON.stringify(capture.payload),
      token,
    })
    await markSynced(capture)
    return "synced"
  } catch (err: unknown) {
    if (isNetworkError(err)) {
      await markRetry(capture, "network")
      return "retry"
    }

    const apiErr = err as ApiError
    if (apiErr.status === 401) return "login"

    if (apiErr.status === 429) {
      // No es culpa de la captura: es la tanda yendo demasiado rápido. No
      // consume intentos, porque agotarlos mandaría a revisión humana algo que
      // solo necesitaba esperar.
      return "throttled"
    }

    if (isBusinessRejection(apiErr)) {
      await markRejected(capture, apiErr.message)
      return "rejected"
    }

    await markRetry(capture, apiErr.message)
    return "retry"
  }
}

/** Envía lo que esté listo. Devuelve el resumen de la tanda. */
export async function syncQueue(token: string, userId: string): Promise<SyncOutcome> {
  if (running || !token || !userId) return EMPTY
  if (typeof navigator !== "undefined" && navigator.onLine === false) return EMPTY

  running = true
  const outcome: SyncOutcome = { ...EMPTY }

  try {
    const pending = await dueCaptures(userId)

    for (const [index, capture] of pending.entries()) {
      if (index > 0) await sleep(GAP_MS)

      const result = await sendOne(capture, token)
      if (result === "synced") outcome.synced += 1
      if (result === "rejected") outcome.rejected += 1
      if (result === "retry") outcome.retry += 1
      if (result === "login") {
        outcome.needsLogin = true
        break
      }
      // El límite por minuto se agotó: seguir sería pedir más rechazos. El
      // resto de la cola espera a la siguiente tanda, intacta.
      if (result === "throttled") break

      // Se cayó la red en mitad de la tanda: el resto espera a la siguiente en
      // vez de gastar un intento cada una por el mismo motivo.
      if (typeof navigator !== "undefined" && navigator.onLine === false) break
    }
  } finally {
    running = false
  }

  return outcome
}
