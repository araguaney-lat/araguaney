import type { CreateIntakePayload } from "@/lib/actions"
import { releaseCodes, takeCodes } from "./box-codes"
import { enqueueCapture } from "./queue"
import type { CaptureSummary } from "./types"

/* Encolar una captura, con sus códigos (Fase 25, tasks 5 y 7).
 *
 * Junta las dos piezas en un solo paso porque van juntas en la realidad: la
 * caja que se captura sin señal necesita su etiqueta ahora mismo, y la etiqueta
 * necesita un código que el servidor apartó antes. */

export interface QueuedResult {
  capture_id: string
  /** Los códigos que se pegarán a las cajas. Vacío si el bloque se agotó. */
  codes: string[]
  /** El bloque no daba para todas las cajas de esta captura. La captura se
   * guarda igual —perderla sería mucho peor— pero sus etiquetas se imprimen al
   * sincronizar, no aquí. */
  withoutCodes: boolean
}

export async function queueCapture(args: {
  payload: CreateIntakePayload
  userId: string
  centerId: string
  summary: CaptureSummary
}): Promise<QueuedResult> {
  const captureId = crypto.randomUUID()
  const boxCount = args.payload.boxes.length

  const codes = await takeCodes(args.centerId, captureId, boxCount)

  // Todo o nada: media captura con etiqueta y media sin ella es la que acaba
  // con dos cajas indistinguibles en la tarima.
  const usable = codes.length === boxCount ? codes : []
  if (usable.length === 0 && codes.length > 0) await releaseCodes(codes)

  const payload: CreateIntakePayload = {
    ...args.payload,
    capture_id: captureId,
    boxes: args.payload.boxes.map((box, i) => ({
      ...box,
      code: usable[i],
    })),
  }

  await enqueueCapture({
    payload,
    userId: args.userId,
    codes: usable,
    summary: args.summary,
    captureId,
  })

  return { capture_id: captureId, codes: usable, withoutCodes: usable.length === 0 }
}
