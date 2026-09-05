import { describe, expect, it } from "vitest"

import { applyLabelReading, downscaleTarget, labelHint } from "@/lib/label-reading"

const fila = (over: Partial<{ batch: string; expiry_date: string }> = {}) => ({
  batch: "",
  expiry_date: "",
  ...over,
})

describe("qué llena una lectura de etiqueta", () => {
  it("llena lote y caducidad cuando están vacíos", () => {
    const r = applyLabelReading(fila(), { batch: "L2291", expiry_date: "2028-03-31" })

    expect(r).toEqual({ batch: "L2291", expiry_date: "2028-03-31" })
  })

  it("nunca pisa lo que una persona ya escribió", () => {
    // La IA pre-llena, la persona confirma. Sobrescribir lo tecleado invierte
    // esa relación, y encima destruye trabajo hecho mirando la caja.
    const r = applyLabelReading(fila({ batch: "L-A-MANO" }), {
      batch: "L2291",
      expiry_date: "2028-03-31",
    })

    expect(r.batch).toBe("L-A-MANO")
    expect(r.expiry_date).toBe("2028-03-31")
  })

  it("ignora los campos que la lectura no logró leer", () => {
    const r = applyLabelReading(fila(), { batch: "L2291" })

    expect(r.batch).toBe("L2291")
    expect(r.expiry_date).toBe("")
  })

  it("no toca la fila cuando no se leyó nada", () => {
    const original = fila({ batch: "L1" })

    expect(applyLabelReading(original, {})).toEqual(original)
  })

  it("no inventa una fecha con formato distinto al del campo", () => {
    // El campo es un input de fecha: cualquier cosa que no sea AAAA-MM-DD lo
    // dejaría en un estado que el navegador no muestra y nadie puede corregir
    // sin borrarlo.
    const r = applyLabelReading(fila(), { expiry_date: "03/2028" })

    expect(r.expiry_date).toBe("")
  })
})

describe("qué se muestra de lo que identifica al producto", () => {
  it("junta los campos del SKU en una línea legible", () => {
    const hint = labelHint({ inn_name: "Paracetamol", form: "Tableta", strength: "500 mg" })

    expect(hint).toBe("Paracetamol · 500 mg · Tableta")
  })

  it("omite lo que no se leyó en vez de dejar huecos", () => {
    expect(labelHint({ inn_name: "Paracetamol" })).toBe("Paracetamol")
  })

  it("no dice nada cuando no hay nada que decir", () => {
    expect(labelHint({ batch: "L1" })).toBe("")
  })
})

describe("a qué tamaño se reduce la foto antes de subirla", () => {
  it("encoge el lado largo y conserva la proporción", () => {
    // Una foto de teléfono pesa 8-12 MB. El modelo no necesita más resolución
    // para leer una cajita, y en un sótano esa subida es la conexión que hace
    // falta para lo demás.
    expect(downscaleTarget(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 })
  })

  it("funciona igual con la foto en vertical", () => {
    expect(downscaleTarget(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it("deja en paz una imagen que ya es chica", () => {
    // Volver a comprimir lo que ya cabe solo pierde detalle de la etiqueta.
    expect(downscaleTarget(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})
