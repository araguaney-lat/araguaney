import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

/* La acción principal de una pantalla no puede partirse en dos líneas.
 *
 * En un teléfono, un botón con texto compite por ancho con el título de la
 * pantalla y se parte: "+ Nuevo" arriba y "tipo" abajo. Además de feo, empuja
 * el título y descuadra la cabecera entera. `PageAction` deja solo el icono
 * debajo de `sm` y conserva la etiqueta en `aria-label`.
 */

const APP = path.join(process.cwd(), "app")

function paginas(): string[] {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, e.name)
      if (e.isDirectory()) recorrer(ruta)
      else if (e.name === "page.tsx") salida.push(ruta)
    }
  }
  recorrer(APP)
  return salida
}

describe("acción principal de pantalla", () => {
  it("ninguna cabecera vuelve a poner un botón de texto suelto", () => {
    // La firma del problema: dentro de un contenedor de cabecera, un enlace o
    // botón con fondo de color y padding horizontal fijo. Eso es lo que se
    // parte a 390px.
    const culpables: string[] = []

    for (const archivo of paginas()) {
      const fuente = fs.readFileSync(archivo, "utf-8")
      const cabeceras = fuente.match(
        /<div className="[^"]*flex items-center justify-between[^"]*">[\s\S]{0,1200}?<\/div>\n\s*\n/g
      )
      if (!cabeceras) continue

      for (const cabecera of cabeceras) {
        if (!cabecera.includes("<h1")) continue
        // Un botón crudo con fondo de marca y padding: el patrón que se parte.
        const crudo = /className="[^"]*(bg-\[var\(--blue\)\]|bg-\[var\(--gold\)\])[^"]*px-[34][^"]*"/.test(cabecera)
        if (crudo) culpables.push(path.relative(process.cwd(), archivo))
      }
    }

    expect([...new Set(culpables)]).toEqual([])
  })

  it("el componente conserva el nombre accesible al esconder el texto", () => {
    // Un icono sin nombre accesible es un botón que para algunas personas no
    // existe. Esconder el texto no puede esconder también la etiqueta.
    const fuente = fs.readFileSync(
      path.join(process.cwd(), "src", "components", "PageAction.tsx"),
      "utf-8"
    )

    expect(fuente).toContain("aria-label={label}")
    expect(fuente).toContain("title={label}")
    expect(fuente).toContain("hidden sm:inline")
  })
})
