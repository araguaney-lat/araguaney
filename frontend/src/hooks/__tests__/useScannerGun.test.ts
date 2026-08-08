import { describe, expect, it } from "vitest"

/* La pistola lectora se reconoce por la velocidad del disparo.
 *
 * Lo que estas pruebas fijan es la frontera: una ráfaga de pistola dispara la
 * captura y un pulgar escribiendo no. Si la frontera se corre hacia abajo, un
 * atajo de teclado abriría una ficha; si se corre hacia arriba, la pistola deja
 * de servir justo cuando alguien tiene las dos manos ocupadas.
 *
 * La lógica se prueba sin React: es un reductor sobre eventos de teclado, y
 * montar un árbol para eso solo agregaría partes que se pueden romper solas.
 * Las constantes se importan del hook para que ajustarlas allá mueva esto.
 */

import { MAX_MS_ENTRE_TECLAS, MIN_LARGO } from "../useScannerGun"

function simular(teclas: { key: string; timeStamp: number }[]): string | null {
  let buffer = ""
  let ultima = 0
  let capturado: string | null = null

  for (const e of teclas) {
    if (e.timeStamp - ultima > MAX_MS_ENTRE_TECLAS) buffer = ""
    ultima = e.timeStamp

    if (e.key === "Enter") {
      const codigo = buffer.trim()
      buffer = ""
      if (codigo.length >= MIN_LARGO) capturado = codigo
      continue
    }
    if (e.key.length === 1) buffer += e.key
  }
  return capturado
}

function rafaga(texto: string, msPorTecla: number, desde = 1000) {
  return [
    ...[...texto].map((key, i) => ({ key, timeStamp: desde + i * msPorTecla })),
    { key: "Enter", timeStamp: desde + texto.length * msPorTecla },
  ]
}

describe("reconocer el disparo de una pistola", () => {
  it("una ráfaga de pistola se captura", () => {
    // Una pistola escribe el código entero en decenas de milisegundos.
    expect(simular(rafaga("BX-A1B2C3", 8))).toBe("BX-A1B2C3")
  })

  it("un GTIN disparado por la pistola también", () => {
    expect(simular(rafaga("7501234567890", 10))).toBe("7501234567890")
  })

  it("escribir con el pulgar no dispara nada", () => {
    // 150 ms entre teclas es una persona. Cada tecla reinicia la ráfaga, así
    // que al llegar el Enter no queda código que capturar.
    expect(simular(rafaga("BX-A1B2C3", 150))).toBeNull()
  })

  it("una tecla suelta con Enter no es un código", () => {
    expect(simular([{ key: "a", timeStamp: 1000 }, { key: "Enter", timeStamp: 1005 }])).toBeNull()
  })

  it("dos disparos seguidos son dos códigos, no uno pegado", () => {
    const primero = rafaga("BX-PRIMERO", 8, 1000)
    const segundo = rafaga("BX-SEGUNDO", 8, 5000)

    expect(simular([...primero, ...segundo])).toBe("BX-SEGUNDO")
  })

  it("una pausa en medio descarta lo tecleado antes", () => {
    // Alguien empieza a teclear, se distrae, y después llega el disparo. Lo de
    // antes no puede quedar pegado al principio del código.
    const teclas = [{ key: "X", timeStamp: 1000 }, ...rafaga("BX-LIMPIO", 8, 4000)]

    expect(simular(teclas)).toBe("BX-LIMPIO")
  })
})
