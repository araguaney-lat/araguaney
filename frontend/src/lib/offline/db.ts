import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import type { CachedProduct, QueuedCapture, ReservedCode } from "./types"

/* IndexedDB y no `localStorage`: `localStorage` es síncrono —bloquea el hilo
 * que está pintando el formulario— y ronda los 5 MB. Una jornada de capturas
 * con su catálogo no cabe con holgura, y el día que no quepa fallaría al
 * escribir, que es justo el momento en que no hay red para avisar de nada. */

const DB_NAME = "araguaney-offline"
const DB_VERSION = 1

interface OfflineDB extends DBSchema {
  catalog: {
    key: string
    value: CachedProduct
  }
  captures: {
    key: string
    value: QueuedCapture
    indexes: { by_status: string }
  }
  codes: {
    key: string
    value: ReservedCode
    indexes: { by_center: string }
  }
  meta: {
    key: string
    value: { key: string; value: number }
  }
}

let handle: Promise<IDBPDatabase<OfflineDB>> | null = null

/** Abre la base local. Devuelve `null` donde no hay IndexedDB —renderizado en
 * el servidor, o un navegador en modo privado que la bloquea— para que quien
 * llama degrade en vez de romperse: sin cola, la aplicación se comporta como
 * antes de esta fase. */
export function offlineDB(): Promise<IDBPDatabase<OfflineDB>> | null {
  if (typeof indexedDB === "undefined") return null
  if (handle) return handle

  handle = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore("catalog", { keyPath: "id" })

      const captures = db.createObjectStore("captures", { keyPath: "capture_id" })
      captures.createIndex("by_status", "status")

      const codes = db.createObjectStore("codes", { keyPath: "code" })
      codes.createIndex("by_center", "center_id")

      db.createObjectStore("meta", { keyPath: "key" })
    },
  }).catch((err) => {
    // Un navegador puede negar IndexedDB sin previo aviso. Si eso ocurre se
    // vuelve a intentar en la siguiente llamada en vez de dejar la promesa
    // rechazada cacheada para toda la sesión.
    handle = null
    throw err
  })

  return handle
}

export async function readMeta(key: string): Promise<number | null> {
  const db = await offlineDB()
  if (!db) return null
  const row = await db.get("meta", key)
  return row?.value ?? null
}

export async function writeMeta(key: string, value: number): Promise<void> {
  const db = await offlineDB()
  if (!db) return
  await db.put("meta", { key, value })
}

/** Borra todo lo local. Se usa al cerrar sesión con la cola vacía: el catálogo
 * y los códigos de un centro no tienen por qué quedarse en un dispositivo
 * prestado. Nunca borra capturas pendientes — eso sería perder trabajo. */
export async function clearOfflineData(): Promise<void> {
  const db = await offlineDB()
  if (!db) return
  await Promise.all([db.clear("catalog"), db.clear("codes"), db.clear("meta")])
}
