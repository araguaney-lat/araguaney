import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

/* El icono de un `PageAction` viaja por nombre, no como componente.
 *
 * `PageAction` es un componente de cliente. Una página de servidor no puede
 * pasarle un componente como prop: React serializa las props para cruzar esa
 * frontera y una función no se serializa. El error que sale no menciona el
 * icono ni el archivo culpable, solo "Functions cannot be passed directly to
 * Client Components", así que cuesta rastrearlo.
 *
 * Rompió `/dashboard/intake` en producción. Es la única página de servidor que
 * usa esta acción, y estuvo caída para quien tenía sesión mientras las otras
 * nueve —todas de cliente— seguían funcionando. Por eso no basta con arreglar
 * la página: hace falta que la próxima página de servidor que use un
 * `PageAction` no pueda repetirlo.
 *
 * TypeScript no atrapa esto. Un componente es un valor válido para una prop; el
 * fallo ocurre al serializar, en tiempo de ejecución. De ahí esta prueba, que
 * lee el código como lo hace `action-labels.test.ts`.
 */

const APP = path.join(process.cwd(), "app")

function paginas(): string[] {
  const encontradas: string[] = []
  const recorrer = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, e.name)
      if (e.isDirectory()) {
        recorrer(ruta)
        continue
      }
      if (e.name.endsWith(".tsx")) encontradas.push(ruta)
    }
  }
  recorrer(APP)
  return encontradas
}

describe("el icono de PageAction", () => {
  it("nunca se pasa como referencia de componente", () => {
    const culpables: string[] = []

    for (const ruta of paginas()) {
      const fuente = fs.readFileSync(ruta, "utf-8")
      if (!fuente.includes("<PageAction")) continue

      for (const uso of fuente.matchAll(/<PageAction[\s\S]{0,400}?icon=(\{[^}]*\}|"[^"]*")/g)) {
        const valor = uso[1]
        // Válido: `icon="plus"` o un ternario entre cadenas.
        const soloCadenas = /^"[^"]*"$/.test(valor) || /^\{[^}]*\}$/.test(valor) && !/[{?:\s]([A-Z]\w*)/.test(valor)
        if (!soloCadenas) {
          culpables.push(`${path.relative(APP, ruta)}: icon=${valor}`)
        }
      }
    }

    expect(
      culpables,
      "El icono debe ir por nombre (icon=\"plus\"). Pasar el componente rompe " +
        "cualquier página de servidor que use este botón.",
    ).toEqual([])
  })

  it("solo usa nombres que PageAction conoce", () => {
    const componente = fs.readFileSync(
      path.join(process.cwd(), "src/components/PageAction.tsx"),
      "utf-8",
    )
    const declarados = new Set(
      [...componente.matchAll(/const ICONOS = \{([^}]+)\}/g)]
        .flatMap((m) => [...m[1].matchAll(/(\w+):/g)])
        .map((m) => m[1]),
    )

    expect(declarados.size, "No se encontró el mapa de iconos").toBeGreaterThan(0)

    const usados = new Set<string>()
    for (const ruta of paginas()) {
      const fuente = fs.readFileSync(ruta, "utf-8")
      if (!fuente.includes("<PageAction")) continue
      for (const uso of fuente.matchAll(/<PageAction[\s\S]{0,400}?icon=(\{[^}]*\}|"[^"]*")/g)) {
        for (const nombre of uso[1].matchAll(/"([^"]+)"/g)) usados.add(nombre[1])
      }
    }

    const desconocidos = [...usados].filter((n) => !declarados.has(n))
    expect(desconocidos, "Nombres de icono sin entrada en ICONOS").toEqual([])
  })
})
