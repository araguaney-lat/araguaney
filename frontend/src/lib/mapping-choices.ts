/**
 * Qué elecciones de mapeo se registran al cerrar una captura (Fase 23, task 8).
 *
 * El conjunto de evaluación de la fase está escrito a mano porque nada guarda
 * el par que importa: el texto que escribió quien dona y el producto que
 * terminó eligiendo quien captura. Ese par solo existe durante unos segundos,
 * en esta pantalla, y hasta ahora se perdía al enviar.
 *
 * La regla vive aquí y no dentro del formulario para poder probarla: decidir
 * qué se guarda es lo único que tiene consecuencia, porque de estos renglones
 * sale después el número que dice si la capacidad acierta.
 */

export interface MappingChoice {
  free_text: string
  suggested_product_type_ids: string[]
  chosen_product_type_id: string
}

/** Una fila de captura, en lo poco que le importa a esta regla. */
export interface ChoiceSource {
  /** El renglón del donante del que nació la fila. Vacío si la agregó a mano
   *  quien captura. */
  donorText: string
  /** Lo que la IA propuso para ese renglón, en orden. Vacío si nadie pidió
   *  sugerencias. */
  suggestedIds: string[]
  product_type: { id: string } | null
}

/**
 * Los pares que vale la pena registrar de una captura.
 *
 * Se guarda lo que quedó en la caja, no lo que se pulsó: quien captura puede
 * aceptar una sugerencia y cambiarla después, y lo que importa medir es en qué
 * terminó el inventario. Por eso también se guardan las filas donde nadie pidió
 * sugerencias o donde se eligió algo que no estaba entre ellas — esa segunda es
 * la señal más valiosa, porque es la única que dice que el modelo se equivocó.
 */
export function mappingChoicesFrom(rows: readonly ChoiceSource[]): MappingChoice[] {
  return rows.flatMap((row) => {
    const free_text = row.donorText.trim()
    if (!free_text || !row.product_type) return []
    return [{
      free_text,
      suggested_product_type_ids: row.suggestedIds,
      chosen_product_type_id: row.product_type.id,
    }]
  })
}
