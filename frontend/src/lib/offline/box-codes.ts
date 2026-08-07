import { apiFetch } from "@/lib/api"
import { offlineDB } from "./db"
import type { ReservedCode } from "./types"

/* Bloque de códigos de caja guardado en el dispositivo (Fase 25, tasks 4-7).
 *
 * El servidor los aparta mientras hay señal y aquí se gastan sin ella. Un
 * código apartado no es inventario: mientras nadie lo use no cuenta en ningún
 * reporte, así que reponer de más no cuesta nada y quedarse corto sí — sin
 * código no hay etiqueta imprimible, y una caja que sale sin etiqueta no se
 * vuelve a etiquetar nunca. */

/** Por debajo de esto se repone. Cubre de sobra lo que un centro captura entre
 * dos ratos con señal. */
const LOW_WATER_MARK = 30
/** Cuántos se piden al reponer. El tope del servidor es mayor; pedir menos
 * mantiene el bloque fresco y evita apartar números que nadie va a usar. */
const REFILL_SIZE = 60

/** Cuántos códigos sin gastar quedan para este centro. */
export async function availableCodes(centerId: string): Promise<number> {
  const db = await offlineDB()
  if (!db) return 0
  const all = await db.getAllFromIndex("codes", "by_center", centerId)
  return all.filter((c) => c.capture_id === null).length
}

/** Repone el bloque local si va bajo. Solo hace algo con señal, que es el
 * único momento en que puede: se llama al abrir la aplicación y al volver la
 * conexión, no cuando ya se acabaron. */
export async function topUpCodes(
  token: string,
  centerId: string
): Promise<number> {
  const db = await offlineDB()
  if (!db || !centerId) return 0

  const disponibles = await availableCodes(centerId)
  if (disponibles >= LOW_WATER_MARK) return disponibles

  const { codes } = await apiFetch<{ codes: string[] }>("/v1/boxes/codes/reserve", {
    method: "POST",
    body: JSON.stringify({ count: REFILL_SIZE - disponibles }),
    token,
  })

  const tx = db.transaction("codes", "readwrite")
  for (const code of codes) {
    await tx.store.put({ code, center_id: centerId, capture_id: null })
  }
  await tx.done

  return disponibles + codes.length
}

/** Aparta `count` códigos para una captura concreta.
 *
 * Devuelve menos de los pedidos —incluso ninguno— si el bloque se agotó. Quien
 * llama decide qué hacer con eso; aquí no se inventa un código, porque un
 * número que el servidor no apartó se rechaza al sincronizar y la caja ya
 * llevaría esa etiqueta pegada. */
export async function takeCodes(
  centerId: string,
  captureId: string,
  count: number
): Promise<string[]> {
  const db = await offlineDB()
  if (!db || !centerId) return []

  const tx = db.transaction("codes", "readwrite")
  const libres = (await tx.store.index("by_center").getAll(centerId))
    .filter((c) => c.capture_id === null)
    .slice(0, count)

  for (const code of libres) {
    await tx.store.put({ ...code, capture_id: captureId })
  }
  await tx.done

  return libres.map((c) => c.code)
}

/** Devuelve al bloque los códigos de una captura que no llegó a existir.
 *
 * Si el servidor la rechazó, nunca marcó esos códigos como usados: seguirían
 * apartados a nombre de una captura muerta y el bloque se iría vaciando solo
 * sin que nadie viera por qué. */
export async function releaseCodes(codes: string[]): Promise<void> {
  const db = await offlineDB()
  if (!db || codes.length === 0) return

  const tx = db.transaction("codes", "readwrite")
  for (const code of codes) {
    const row: ReservedCode | undefined = await tx.store.get(code)
    if (row) await tx.store.put({ ...row, capture_id: null })
  }
  await tx.done
}

/** Olvida los códigos de una captura que sí llegó. El servidor ya los marcó
 * usados; conservarlos aquí solo abultaría la base local. */
export async function forgetCodes(codes: string[]): Promise<void> {
  const db = await offlineDB()
  if (!db || codes.length === 0) return

  const tx = db.transaction("codes", "readwrite")
  for (const code of codes) await tx.store.delete(code)
  await tx.done
}
