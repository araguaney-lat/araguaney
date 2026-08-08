"use client"

import { useMemo, useSyncExternalStore } from "react"
import { BrowserQRCodeSvgWriter } from "@zxing/library"
import type { QueuedCapture } from "@/lib/offline/types"
import { useDict, useLocale } from "@/context/DictionaryContext"

/* Etiquetas de cajas capturadas sin conexión (Fase 25, task 11).
 *
 * El PDF en lote lo sigue generando el servidor: es trabajo pesado, sale
 * paginado en A4 y se pide con señal. Esto es lo otro — la etiqueta que hay que
 * pegar **ahora**, en el andén, sobre una caja que se acaba de cerrar. Si no
 * sale en ese momento no sale nunca: nadie vuelve a abrir una tarima para
 * etiquetar una caja que ya está dentro.
 *
 * El QR se dibuja aquí con el código que el servidor apartó de antemano, así
 * que apunta a la misma ficha pública `/b/{code}` que apuntará cuando la caja
 * exista. No hay dos verdades: el número es el mismo antes y después de
 * sincronizar. */

const QR_SIZE = 96

/** `BrowserQRCodeSvgWriter` viene de `@zxing/library`, que ya está en el
 * proyecto para leer códigos de barras con la cámara. Codificar es la operación
 * inversa de lo que ya hacía; no hace falta una dependencia nueva. */
function useQrSvg(url: string): string {
  return useMemo(() => {
    try {
      const element = new BrowserQRCodeSvgWriter().write(url, QR_SIZE, QR_SIZE)
      return element.outerHTML
    } catch {
      return ""
    }
  }, [url])
}

function Label({
  code,
  origin,
  productName,
  quantity,
  unit,
  batch,
  expiry,
  campaignName,
}: {
  code: string
  origin: string
  productName: string
  quantity: number
  unit: string
  batch?: string
  expiry?: string
  campaignName: string
}) {
  // Misma URL que codifica el servidor en `box_qr_png`.
  const svg = useQrSvg(`${origin}/b/${code}`)
  // Las mismas palabras que imprime el servidor en su PDF, en el mismo idioma:
  // la misma caja no puede salir con dos etiquetas distintas según quién la
  // imprimió.
  const t = useDict().dashboard.intake_labels
  const locale = useLocale()

  return (
    <div className="flex gap-3 break-inside-avoid rounded border border-cardB p-3">
      <div
        className="shrink-0 [&>svg]:h-24 [&>svg]:w-24"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="min-w-0 text-xs leading-tight">
        <p className="font-mono font-semibold text-tx">{code}</p>
        <p className="mt-1 truncate text-tx">{productName}</p>
        <p className="text-mut">
          {t.field_quantity}: {quantity} {unit}
        </p>
        {batch && <p className="text-mut">{t.field_batch}: {batch}</p>}
        {expiry && (
          <p className="text-mut">
            {t.field_expiry}: {new Date(`${expiry}T00:00:00`).toLocaleDateString(locale)}
          </p>
        )}
        {/* El nombre del centro no viaja en la sesión, así que aquí va la
            campaña. El QR ya identifica la caja sin ambigüedad; esto es solo
            para leer de lejos en el andén. */}
        <p className="mt-1 truncate text-[10px] text-fnt">{campaignName}</p>
      </div>
    </div>
  )
}

export function OfflineLabelSheet({ captures }: { captures: QueuedCapture[] }) {
  // window.location.origin no cambia sin navegar; se lee con el snapshot y
  // devuelve "" en el servidor, donde no hay window.
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  )

  const labels = captures.flatMap((capture) =>
    capture.payload.boxes
      .filter((box) => Boolean(box.code))
      .map((box, i) => ({
        key: `${capture.capture_id}-${i}`,
        code: box.code as string,
        productName: capture.summary.boxes[i]?.product_name ?? "",
        quantity: box.quantity,
        unit: box.unit,
        batch: box.batch,
        expiry: box.expiry_date,
        campaignName: capture.summary.campaign_name,
      }))
  )

  if (labels.length === 0 || !origin) return null

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
      {labels.map(({ key, ...label }) => (
        <Label key={key} origin={origin} {...label} />
      ))}
    </div>
  )
}
