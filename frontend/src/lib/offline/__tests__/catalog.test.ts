import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { offlineDB } from "../db"
import {
  countCatalog,
  catalogIsStale,
  lookupLocalGtin,
  refreshCatalog,
  searchLocalCatalog,
} from "../catalog-cache"

/* Catálogo en el dispositivo (Fase 25, task 6).
 *
 * Lo que estas pruebas sostienen: un producto que se puede elegir en el sótano
 * es uno que el servidor va a aceptar cuando la captura llegue. Si la
 * visibilidad por campaña no coincidiera con la del servidor, la captura se
 * rechazaría al sincronizar, cuando ya nadie está delante para corregirla. */

const CAMPAIGN_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const CAMPAIGN_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

function product(id: string, display_name: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    category: "FOOD",
    display_name,
    unspsc_code: null,
    inn_name: null,
    brand: null,
    strength: null,
    form: null,
    gtin: null,
    default_unit: "lata",
    is_controlled: false,
    min_shelf_life_days: null,
    ...extra,
  }
}

const ATUN = product("11111111-1111-4111-8111-111111111111", "Atún en lata", {
  gtin: "7501234567890",
})
const IBUPROFENO = product("22222222-2222-4222-8222-222222222222", "Ibuprofeno 500mg", {
  category: "MEDICINE",
  inn_name: "Ibuprofen",
})

/** Responde a `/api/catalog/search` según la campaña que se pida. */
function serve(byCampaign: Record<string, unknown[]>) {
  return vi.fn(async (url: string) => {
    const campaign = new URL(url, "http://x").searchParams.get("campaign_id") ?? ""
    return { ok: true, json: async () => byCampaign[campaign] ?? [] } as Response
  })
}

beforeEach(async () => {
  const db = await offlineDB()
  await Promise.all([db!.clear("catalog"), db!.clear("meta")])
})
afterEach(() => vi.unstubAllGlobals())

describe("descargar", () => {
  it("guarda con qué campaña se vio cada producto", async () => {
    vi.stubGlobal("fetch", serve({ [CAMPAIGN_A]: [ATUN], [CAMPAIGN_B]: [ATUN, IBUPROFENO] }))

    await refreshCatalog([CAMPAIGN_A, CAMPAIGN_B])

    expect(await countCatalog()).toBe(2)
    // El ibuprofeno solo es visible en B: ofrecerlo en A sería ofrecer algo que
    // el servidor va a rechazar cuando la captura llegue.
    expect(await searchLocalCatalog("ibup", CAMPAIGN_A)).toHaveLength(0)
    expect(await searchLocalCatalog("ibup", CAMPAIGN_B)).toHaveLength(1)
    // El atún se vio en las dos, así que sale en las dos.
    expect(await searchLocalCatalog("atun", CAMPAIGN_A)).toHaveLength(1)
    expect(await searchLocalCatalog("atun", CAMPAIGN_B)).toHaveLength(1)
  })

  it("una respuesta vacía no borra el catálogo bueno", async () => {
    vi.stubGlobal("fetch", serve({ [CAMPAIGN_A]: [ATUN] }))
    await refreshCatalog([CAMPAIGN_A])

    // Una sesión caducada o un proxy devolviendo `[]` no puede dejar sin
    // catálogo a quien está a punto de bajar al sótano.
    vi.stubGlobal("fetch", serve({}))
    await refreshCatalog([CAMPAIGN_A])

    expect(await countCatalog()).toBe(1)
  })

  it("quita lo que el servidor ya no devuelve", async () => {
    vi.stubGlobal("fetch", serve({ [CAMPAIGN_A]: [ATUN, IBUPROFENO] }))
    await refreshCatalog([CAMPAIGN_A])

    vi.stubGlobal("fetch", serve({ [CAMPAIGN_A]: [ATUN] }))
    await refreshCatalog([CAMPAIGN_A])

    expect(await countCatalog()).toBe(1)
    expect(await searchLocalCatalog("ibup", CAMPAIGN_A)).toHaveLength(0)
  })

  it("un catálogo recién descargado no está viejo", async () => {
    expect(await catalogIsStale()).toBe(true)

    vi.stubGlobal("fetch", serve({ [CAMPAIGN_A]: [ATUN] }))
    await refreshCatalog([CAMPAIGN_A])

    expect(await catalogIsStale()).toBe(false)
  })
})

describe("buscar sin señal", () => {
  beforeEach(async () => {
    vi.stubGlobal("fetch", serve({ [CAMPAIGN_A]: [ATUN, IBUPROFENO] }))
    await refreshCatalog([CAMPAIGN_A])
  })

  it("ignora acentos y mayúsculas", async () => {
    // Quien captura teclea con prisa y con una mano.
    expect(await searchLocalCatalog("ATÚN", CAMPAIGN_A)).toHaveLength(1)
    expect(await searchLocalCatalog("atun", CAMPAIGN_A)).toHaveLength(1)
  })

  it("busca también por principio activo", async () => {
    expect(await searchLocalCatalog("ibuprofen", CAMPAIGN_A)).toHaveLength(1)
  })

  it("resuelve un código de barras ya conocido", async () => {
    // Sin señal no hay consulta a la base mundial de productos, pero lo que el
    // catálogo ya había aprendido viaja en el propio producto.
    expect((await lookupLocalGtin("7501234567890"))?.display_name).toBe("Atún en lata")
    expect(await lookupLocalGtin("0000000000000")).toBeNull()
  })
})
