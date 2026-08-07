import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { clearOfflineData, offlineDB } from "../db"
import {
  MAX_ATTEMPTS,
  dueCaptures,
  discardCapture,
  listCaptures,
  pendingCount,
  needsAttentionCount,
} from "../queue"
import { queueCapture } from "../capture"
import { availableCodes } from "../box-codes"
import { syncQueue } from "../sync"
import type { CreateIntakePayload } from "@/lib/actions"

/* Cola de captura sin conexión (Fase 25, tasks 7 y 8).
 *
 * Lo que estas pruebas sostienen es la promesa de la fase: una captura hecha
 * en un sótano llega entera, una sola vez, y si no puede llegar queda a la
 * vista de alguien en vez de desaparecer. */

const USER = "11111111-1111-4111-8111-111111111111"
const OTHER_USER = "22222222-2222-4222-8222-222222222222"
const CENTER = "33333333-3333-4333-8333-333333333333"

const PAYLOAD: CreateIntakePayload = {
  campaign_id: "44444444-4444-4444-8444-444444444444",
  boxes: [{ product_type_id: "55555555-5555-4555-8555-555555555555", quantity: 10, unit: "lata" }],
}

const SUMMARY = {
  campaign_name: "Donaciones Generales",
  boxes: [{ product_name: "Atún en lata", quantity: 10, unit: "lata" }],
}

async function reset(): Promise<void> {
  const db = await offlineDB()
  if (!db) throw new Error("sin IndexedDB")
  await Promise.all([
    db.clear("captures"),
    db.clear("codes"),
    db.clear("catalog"),
    db.clear("meta"),
  ])
}

/** Deja `count` códigos apartados, como los habría dejado una reserva hecha
 * con señal antes de bajar al sótano. */
async function seedCodes(count: number): Promise<void> {
  const db = await offlineDB()
  if (!db) return
  for (let i = 0; i < count; i += 1) {
    await db.put("codes", { code: `BX-TEST${i}`, center_id: CENTER, capture_id: null })
  }
}

function enqueue(payload: CreateIntakePayload = PAYLOAD, userId = USER) {
  return queueCapture({ payload, userId, centerId: CENTER, summary: SUMMARY })
}

/** Respuesta del servidor. `apiFetch` lee `detail` para el mensaje. */
function respond(status: number, message = "no") {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => (status < 300 ? {} : { detail: { code: "X", message } }),
  } as Response
}

beforeEach(reset)
afterEach(() => vi.unstubAllGlobals())

describe("encolar", () => {
  it("guarda la llave de idempotencia dentro del payload", async () => {
    const { capture_id } = await enqueue()

    const [capture] = await listCaptures()
    expect(capture.capture_id).toBe(capture_id)
    // Es lo que impide que un reintento duplique inventario: el servidor
    // reconoce la captura por esta llave, no por su contenido.
    expect(capture.payload.capture_id).toBe(capture_id)
    expect(await pendingCount()).toBe(1)
  })

  it("consume un código apartado por caja", async () => {
    await seedCodes(3)

    const { codes, withoutCodes } = await enqueue()

    expect(codes).toHaveLength(1)
    expect(withoutCodes).toBe(false)
    expect(await availableCodes(CENTER)).toBe(2)
  })

  it("captura sin códigos antes que a medio etiquetar", async () => {
    // Dos cajas y un solo código libre: media captura etiquetada y media sin
    // etiquetar acaba con dos bultos indistinguibles en la misma tarima.
    await seedCodes(1)
    const dosCajas = { ...PAYLOAD, boxes: [...PAYLOAD.boxes, ...PAYLOAD.boxes] }

    const { codes, withoutCodes } = await enqueue(dosCajas)

    expect(codes).toEqual([])
    expect(withoutCodes).toBe(true)
    // El código que se había tomado vuelve al bloque: nadie imprimió nada.
    expect(await availableCodes(CENTER)).toBe(1)
  })

  it("no envía la captura de otra persona", async () => {
    // La cola vive en el dispositivo y el dispositivo se comparte. Enviarla con
    // la sesión de quien entre después la atribuiría a otro operador y, si son
    // de centros distintos, a otro centro.
    await enqueue(PAYLOAD, OTHER_USER)

    expect(await dueCaptures(USER)).toHaveLength(0)
    expect(await dueCaptures(OTHER_USER)).toHaveLength(1)
  })
})

describe("sincronizar", () => {
  it("una captura entregada sale de la cola", async () => {
    await seedCodes(1)
    await enqueue()
    vi.stubGlobal("fetch", vi.fn(async () => respond(201)))

    const outcome = await syncQueue("token", USER)

    expect(outcome.synced).toBe(1)
    expect(await pendingCount()).toBe(0)
    expect(await listCaptures()).toHaveLength(0)
    // Ya vive en el servidor: guardar aquí una copia sería tener dos verdades.
    expect(await availableCodes(CENTER)).toBe(0)
  })

  it("un rechazo del servidor la deja visible, no la borra", async () => {
    await seedCodes(1)
    await enqueue()
    vi.stubGlobal("fetch", vi.fn(async () => respond(422, "Caducidad demasiado corta")))

    const outcome = await syncQueue("token", USER)

    expect(outcome.rejected).toBe(1)
    const [capture] = await listCaptures()
    expect(capture.status).toBe("REJECTED")
    expect(capture.last_error).toBe("Caducidad demasiado corta")
    expect(await needsAttentionCount()).toBe(1)
    // No se reintenta sola: daría el mismo resultado.
    expect(await dueCaptures(USER)).toHaveLength(0)
  })

  it("un rechazo no devuelve los códigos al bloque", async () => {
    // La etiqueta con ese número ya está pegada a una caja física. Devolverlo
    // al bloque lo pondría en una segunda caja.
    await seedCodes(1)
    await enqueue()
    vi.stubGlobal("fetch", vi.fn(async () => respond(422)))

    await syncQueue("token", USER)

    const [capture] = await listCaptures()
    expect(capture.codes).toHaveLength(1)
    expect(await availableCodes(CENTER)).toBe(0)
  })

  it("un fallo de red se reintenta más tarde", async () => {
    await enqueue()
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch") }))

    const outcome = await syncQueue("token", USER)

    expect(outcome.retry).toBe(1)
    const [capture] = await listCaptures()
    expect(capture.status).toBe("PENDING")
    expect(capture.attempts).toBe(1)
    // La espera crece: reintentar en bucle gasta batería y datos sin arreglar
    // nada mientras siga sin haber señal.
    expect(capture.retry_after).toBeGreaterThan(Date.now())
  })

  it("tras agotar los intentos espera a una persona", async () => {
    await enqueue()
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch") }))

    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      const db = await offlineDB()
      const [capture] = await listCaptures()
      // Se adelanta el reloj de la espera: lo que se prueba es el agotamiento
      // de los intentos, no cuánto tarda cada uno.
      if (capture) await db!.put("captures", { ...capture, retry_after: 0 })
      await syncQueue("token", USER)
    }

    const [capture] = await listCaptures()
    expect(capture.status).toBe("NEEDS_REVIEW")
    expect(await needsAttentionCount()).toBe(1)
    expect(await pendingCount()).toBe(0)
  })

  it("la llave no cambia entre reintentos", async () => {
    const { capture_id } = await enqueue()
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch") }))

    await syncQueue("token", USER)

    const [capture] = await listCaptures()
    // Si cambiara, cada reintento sería una captura nueva para el servidor y la
    // respuesta perdida acabaría siendo inventario duplicado.
    expect(capture.payload.capture_id).toBe(capture_id)
  })

  it("el límite por minuto detiene la tanda sin gastar intentos", async () => {
    await enqueue()
    await enqueue()
    vi.stubGlobal("fetch", vi.fn(async () => respond(429, "slow down")))

    await syncQueue("token", USER)

    const capturas = await listCaptures()
    // No es culpa de la captura: agotarle los intentos la mandaría a revisión
    // humana por algo que solo necesitaba esperar.
    expect(capturas.every((c) => c.attempts === 0)).toBe(true)
    expect(capturas.every((c) => c.status === "PENDING")).toBe(true)
  })

  it("una sesión caducada no toca la cola", async () => {
    await enqueue()
    vi.stubGlobal("fetch", vi.fn(async () => respond(401, "expired")))

    const outcome = await syncQueue("token", USER)

    expect(outcome.needsLogin).toBe(true)
    const [capture] = await listCaptures()
    expect(capture.status).toBe("PENDING")
    expect(capture.attempts).toBe(0)
  })
})

describe("con conexión permanente", () => {
  it("no se hace ninguna petición si no hay nada encolado", async () => {
    // La promesa de la fase incluye que quien nunca pierde señal no note nada:
    // ni una petición de más, ni un estado nuevo que mantener.
    const peticiones = vi.fn()
    vi.stubGlobal("fetch", peticiones)

    const outcome = await syncQueue("token", USER)

    expect(peticiones).not.toHaveBeenCalled()
    expect(outcome).toEqual({ synced: 0, rejected: 0, retry: 0, needsLogin: false })
  })
})

describe("cerrar sesión", () => {
  it("borra el catálogo y los códigos, nunca las capturas", async () => {
    // Un teléfono de centro se comparte entre turnos: el catálogo y el bloque
    // de códigos de otro centro no tienen por qué quedarse. El trabajo de
    // alguien, sí.
    await seedCodes(2)
    await enqueue()

    await clearOfflineData()

    expect(await listCaptures()).toHaveLength(1)
    expect(await availableCodes(CENTER)).toBe(0)
  })
})

describe("descartar", () => {
  it("es la única forma de que una captura desaparezca, y libera sus códigos", async () => {
    await seedCodes(1)
    const { capture_id } = await enqueue()

    await discardCapture(capture_id)

    expect(await listCaptures()).toHaveLength(0)
    expect(await availableCodes(CENTER)).toBe(1)
  })
})
