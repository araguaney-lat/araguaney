/**
 * Qué hace una lectura de etiqueta con la caja que se está capturando
 * (Fase 23, task 5).
 *
 * El OCR devuelve cinco campos y solo dos son de la caja: `batch` y
 * `expiry_date`. Los otros tres —`inn_name`, `form`, `strength`— identifican al
 * `ProductType`, que es un SKU del catálogo, no un dato de esta caja: se
 * muestran para ayudar a encontrarlo, no se escriben en ningún lado.
 *
 * Las reglas viven aquí y no dentro del formulario porque son la parte con
 * consecuencia: lo que una lectura llena termina impreso en una etiqueta y
 * declarado en un manifiesto.
 */

/** Los cinco campos, tal como los devuelve el backend. Todos opcionales: el
 *  modelo deja en blanco lo que no pudo leer con certeza, que es preferible a
 *  que invente un lote. */
export interface LabelReading {
  inn_name?: string | null
  form?: string | null
  strength?: string | null
  batch?: string | null
  expiry_date?: string | null
}

/** De la fila de captura, lo poco que esta regla toca. */
export interface LabelTarget {
  batch: string
  expiry_date: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * La fila con lo que la lectura aporta, sin pisar nada.
 *
 * **Solo llena campos vacíos.** La IA pre-llena y la persona confirma;
 * sobrescribir lo que alguien ya tecleó invierte esa relación y, peor, destruye
 * trabajo hecho con la caja a la vista. Quien quiera reemplazar lo suyo por lo
 * leído borra el campo y vuelve a leer.
 */
export function applyLabelReading<T extends LabelTarget>(row: T, reading: LabelReading): T {
  const batch = row.batch.trim() === "" ? (reading.batch ?? "").trim() : row.batch
  const leida = (reading.expiry_date ?? "").trim()
  // El campo es un input de fecha: una cadena con otro formato lo dejaría en un
  // estado que el navegador no muestra y que nadie puede corregir sin borrarlo.
  const expiry =
    row.expiry_date.trim() === "" && ISO_DATE.test(leida) ? leida : row.expiry_date

  return { ...row, batch, expiry_date: expiry }
}

/** Lo que identifica al producto, en una línea, para buscarlo en el catálogo. */
export function labelHint(reading: LabelReading): string {
  return [reading.inn_name, reading.strength, reading.form]
    .map((v) => (v ?? "").trim())
    .filter((v) => v !== "")
    .join(" · ")
}

/**
 * A qué tamaño reducir la foto antes de subirla.
 *
 * Una foto de teléfono pesa entre 8 y 12 MB y el backend rechaza por encima de
 * 5 MB, así que sin esto la mayoría de las fotos reales fallarían. Pero el
 * motivo de fondo es otro: en un sótano con mala señal, subir doce megas para
 * leer una cajita se come la conexión que hace falta para registrar la
 * captura — y el modelo no necesita más resolución para leer una etiqueta.
 *
 * Una imagen que ya cabe se deja intacta: volver a comprimirla solo pierde el
 * detalle de la letra chica.
 */
export function downscaleTarget(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const lado = Math.max(width, height)
  if (lado <= maxSide) return { width, height }

  const factor = maxSide / lado
  return { width: Math.round(width * factor), height: Math.round(height * factor) }
}
