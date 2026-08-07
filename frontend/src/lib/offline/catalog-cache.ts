import type { ProductType } from "@/types"
import { offlineDB, readMeta, writeMeta } from "./db"
import type { CachedProduct } from "./types"

/* Catálogo en el dispositivo (Fase 25, task 6).
 *
 * Sin catálogo local no hay captura sin conexión: el formulario pide elegir un
 * producto del catálogo y esa lista vive en el servidor. Se copia entera
 * mientras hay señal, con la misma visibilidad que tendría en línea —los
 * productos globales más los de cada campaña de quien captura— para que un
 * producto que se puede elegir en el sótano sea uno que el servidor va a
 * aceptar cuando la captura llegue. */

const SYNCED_AT = "catalog_synced_at"

/** Cuánto puede envejecer el catálogo antes de avisar. Un día cubre la jornada
 * en la que alguien baja al sótano con lo que descargó por la mañana. */
export const CATALOG_MAX_AGE_MS = 24 * 60 * 60 * 1000

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

/** Descarga el catálogo visible y lo deja guardado.
 *
 * Una petición por campaña, porque la visibilidad se define por campaña y
 * replicarla aquí a mano sería inventar una segunda regla que se desincroniza
 * de la del servidor a la primera. */
export async function refreshCatalog(campaignIds: string[]): Promise<number> {
  const db = await offlineDB()
  if (!db) return 0

  const merged = new Map<string, CachedProduct>()

  for (const campaignId of campaignIds) {
    const params = new URLSearchParams({ q: "" })
    if (campaignId) params.set("campaign_id", campaignId)
    const res = await fetch(`/api/catalog/search?${params}`)
    if (!res.ok) continue
    const products: ProductType[] = await res.json()

    for (const product of products) {
      const previous = merged.get(product.id)
      merged.set(product.id, {
        ...product,
        campaigns: previous ? [...previous.campaigns, campaignId] : [campaignId],
      })
    }
  }

  // Nada que guardar: una respuesta vacía suele ser una sesión caducada o un
  // proxy devolviendo `[]`, y borrar el catálogo bueno por eso dejaría a quien
  // captura sin nada justo cuando baja al sótano.
  if (merged.size === 0) return await countCatalog()

  const tx = db.transaction("catalog", "readwrite")
  const vigentes = new Set(merged.keys())
  for (const id of await tx.store.getAllKeys()) {
    if (!vigentes.has(id)) await tx.store.delete(id)
  }
  for (const product of merged.values()) await tx.store.put(product)
  await tx.done

  await writeMeta(SYNCED_AT, Date.now())
  return merged.size
}

export async function countCatalog(): Promise<number> {
  const db = await offlineDB()
  if (!db) return 0
  return db.count("catalog")
}

export async function catalogSyncedAt(): Promise<number | null> {
  return readMeta(SYNCED_AT)
}

export async function catalogIsStale(): Promise<boolean> {
  const at = await catalogSyncedAt()
  return at === null || Date.now() - at > CATALOG_MAX_AGE_MS
}

/** Busca en el catálogo guardado. Mismo criterio que la búsqueda en línea:
 * nombre, principio activo y marca. */
export async function searchLocalCatalog(
  query: string,
  campaignId: string,
  limit = 20
): Promise<ProductType[]> {
  const db = await offlineDB()
  if (!db) return []

  const needle = normalize(query.trim())
  if (needle.length < 2) return []

  const all = await db.getAll("catalog")
  return all
    .filter((p) => !campaignId || p.campaigns.includes(campaignId))
    .filter((p) =>
      normalize(
        [p.display_name, p.inn_name ?? "", p.brand ?? ""].join(" ")
      ).includes(needle)
    )
    .slice(0, limit)
}

/** Resuelve un código de barras contra el catálogo guardado.
 *
 * Es el único camino sin señal: la consulta a Open Food Facts necesita
 * internet, y el aprendizaje del catálogo —qué GTIN corresponde a qué
 * producto— ya vive en los productos que se descargaron. */
export async function lookupLocalGtin(gtin: string): Promise<ProductType | null> {
  const db = await offlineDB()
  if (!db) return null
  const all = await db.getAll("catalog")
  return all.find((p) => p.gtin === gtin) ?? null
}
