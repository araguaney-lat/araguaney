import { describe, expect, it } from "vitest"

import { mappingChoicesFrom } from "@/lib/mapping-choices"

const producto = (id: string) => ({ id })

describe("qué elecciones de mapeo se registran", () => {
  it("registra el par cuando la fila nació de un texto del donante", () => {
    const choices = mappingChoicesFrom([
      { donorText: "20 latas de atún", suggestedIds: ["a", "b"], product_type: producto("a") },
    ])

    expect(choices).toEqual([
      {
        free_text: "20 latas de atún",
        suggested_product_type_ids: ["a", "b"],
        chosen_product_type_id: "a",
      },
    ])
  })

  it("ignora las cajas que alguien agregó a mano", () => {
    // Sin texto del donante no hay par que medir: esa caja no dice nada sobre
    // cómo se nombra lo que se dona.
    const choices = mappingChoicesFrom([
      { donorText: "", suggestedIds: [], product_type: producto("a") },
    ])

    expect(choices).toEqual([])
  })

  it("ignora la fila sin producto elegido", () => {
    const choices = mappingChoicesFrom([
      { donorText: "3 cobijas", suggestedIds: ["a"], product_type: null },
    ])

    expect(choices).toEqual([])
  })

  it("registra la elección hecha sin pedir sugerencias", () => {
    // Que nadie usara la IA y buscara el producto a mano es justo el caso que
    // la lista corta debió cubrir: se guarda con la lista de sugeridos vacía.
    const choices = mappingChoicesFrom([
      { donorText: "frazadas", suggestedIds: [], product_type: producto("cobija") },
    ])

    expect(choices).toEqual([
      {
        free_text: "frazadas",
        suggested_product_type_ids: [],
        chosen_product_type_id: "cobija",
      },
    ])
  })

  it("registra cuando lo elegido no estaba entre lo sugerido", () => {
    // Es la señal más valiosa del conjunto: el modelo propuso y la persona
    // eligió otra cosa. Descartarla dejaría medir solo los aciertos.
    const choices = mappingChoicesFrom([
      { donorText: "advil 400", suggestedIds: ["paracetamol"], product_type: producto("ibuprofeno") },
    ])

    expect(choices[0].suggested_product_type_ids).toEqual(["paracetamol"])
    expect(choices[0].chosen_product_type_id).toBe("ibuprofeno")
  })

  it("no manda espacios en blanco como texto del donante", () => {
    const choices = mappingChoicesFrom([
      { donorText: "   ", suggestedIds: [], product_type: producto("a") },
    ])

    expect(choices).toEqual([])
  })
})
