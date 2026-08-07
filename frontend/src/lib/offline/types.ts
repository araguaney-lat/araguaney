import type { ProductType } from "@/types"
import type { CreateIntakePayload } from "@/lib/actions"

/** Producto del catálogo tal como queda guardado en el dispositivo.
 *
 * `campaigns` conserva **con qué campañas se vio** el producto, no una
 * propiedad suya. Sin eso, la búsqueda sin conexión ofrecería productos que la
 * campaña elegida no acepta y la captura se rechazaría al sincronizar, cuando
 * ya nadie está delante para corregirla. */
export interface CachedProduct extends ProductType {
  campaigns: string[]
}

/** Estado de una captura encolada.
 *
 * - `PENDING`: se reintentará. Es el único estado que cuenta en el contador.
 * - `REJECTED`: el servidor la rechazó por una regla de negocio. Reintentar
 *   daría el mismo resultado, así que espera a una persona.
 * - `NEEDS_REVIEW`: falló demasiadas veces. Tampoco se reintenta sola.
 *
 * No existe `SYNCED`: una captura que llegó se borra de la cola porque ya vive
 * en el servidor, y dejar una copia local invitaría a leer dos verdades. */
export type CaptureStatus = "PENDING" | "REJECTED" | "NEEDS_REVIEW"

/** Lo que se enseña de una captura en la pantalla de revisión.
 *
 * El payload son identificadores; quien revisa necesita nombres. Se guarda al
 * encolar porque el catálogo pudo cambiar para cuando alguien la mire. */
export interface CaptureSummary {
  campaign_name: string
  boxes: { product_name: string; quantity: number; unit: string }[]
}

export interface QueuedCapture {
  /** Llave de idempotencia. Se genera **antes** del primer intento y no cambia
   * en ningún reintento: es lo que impide que una respuesta perdida duplique
   * inventario. */
  capture_id: string
  /** Quién la capturó. La cola vive en el dispositivo y un dispositivo se
   * comparte: sin esto, la captura de una persona se enviaría con la sesión de
   * la siguiente que entre, y quedaría atribuida a otro centro. */
  user_id: string
  payload: CreateIntakePayload
  /** Códigos reservados que consumió esta captura. Si acaba rechazada se
   * devuelven al bloque local: el servidor nunca llegó a marcarlos usados. */
  codes: string[]
  summary: CaptureSummary
  created_at: number
  attempts: number
  status: CaptureStatus
  /** Último error tal como lo explicó el servidor, para que quien revise sepa
   * qué corregir. */
  last_error: string | null
  /** Momento a partir del cual tiene sentido reintentar (espera creciente). */
  retry_after: number
}

/** Código de caja apartado en el servidor y guardado aquí para gastarlo sin
 * señal. Mientras `capture_id` sea `null` es un número disponible. */
export interface ReservedCode {
  code: string
  center_id: string
  capture_id: string | null
}
