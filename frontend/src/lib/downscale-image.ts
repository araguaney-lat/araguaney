import { downscaleTarget } from "@/lib/label-reading"

/** Lado largo al que se reduce una foto de etiqueta antes de subirla. Suficiente
 *  para que se lea la letra chica de una cajita, y una fracción del peso. */
const MAX_SIDE = 1600

/** Calidad del JPEG resultante. Más abajo empieza a comerse los dígitos de un
 *  lote impreso en fuente pequeña, que es justo lo que hay que leer. */
const QUALITY = 0.85

/**
 * Reduce una foto en el navegador antes de subirla.
 *
 * Es la capa de plomería: la decisión de a qué tamaño reducir vive en
 * `downscaleTarget`, que sí se prueba. Aquí solo está el trato con `canvas`,
 * que necesita un DOM real y no se puede probar sin uno.
 *
 * Si algo falla —un formato que el navegador no decodifica, un canvas que no
 * devuelve blob— se sube el archivo original: el backend tiene su propio tope y
 * dirá que pesa demasiado, que es mejor que perder la lectura por completo.
 */
export async function downscaleImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = downscaleTarget(bitmap.width, bitmap.height, MAX_SIDE)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    )
    if (!blob) return file

    return new File([blob], "etiqueta.jpg", { type: "image/jpeg" })
  } catch {
    return file
  }
}
