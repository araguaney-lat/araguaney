import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

/* La aplicación se usa sobre todo desde el celular.
 *
 * Una tabla de cinco columnas dentro de un contenedor con `overflow-hidden` no
 * se desborda: se **recorta**. La última columna desaparece y no hay forma de
 * llegar a ella, que es peor que una barra de desplazamiento porque no deja
 * rastro de que falta algo. Ya pasó una vez con una columna del PDF de tarima.
 */

const RAICES = ["app", "src"]

function archivosConTabla(): string[] {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, entrada.name)
      if (entrada.isDirectory()) recorrer(ruta)
      else if (ruta.endsWith(".tsx") && fs.readFileSync(ruta, "utf-8").includes("<table")) {
        salida.push(ruta)
      }
    }
  }
  for (const raiz of RAICES) recorrer(path.join(process.cwd(), raiz))
  return salida
}

describe("tablas en móvil", () => {
  it("ninguna tabla vive dentro de un contenedor que la recorta", () => {
    const culpables: string[] = []

    for (const archivo of archivosConTabla()) {
      const lineas = fs.readFileSync(archivo, "utf-8").split("\n")
      lineas.forEach((linea, i) => {
        if (!linea.includes("<table")) return
        // El contenedor está en las líneas inmediatamente anteriores.
        const previas = lineas.slice(Math.max(0, i - 3), i).join(" ")
        if (previas.includes("overflow-hidden")) {
          culpables.push(`${path.relative(process.cwd(), archivo)}:${i + 1}`)
        }
      })
    }

    expect(culpables).toEqual([])
  })
})
