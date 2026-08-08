import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import es from "../../dictionaries/es.json"
import en from "../../dictionaries/en.json"

/* La etiqueta de un `PageAction` no lleva el signo dentro.
 *
 * El icono ya es un `+`. Con el signo también en el texto se pintan dos en
 * escritorio, y en móvil —donde el texto se esconde y la etiqueta pasa a
 * `aria-label`— un lector de pantalla anuncia "más Nuevo tipo".
 *
 * Se detectó verificando en producción: las etiquetas venían de cuando el botón
 * era solo texto y el `+` tenía que escribirse a mano.
 */

const APP = path.join(process.cwd(), "app")

/** Los pares sección/clave que llegan a un `PageAction`, leídos del código en
 * vez de mantenidos a mano: una lista aparte se queda vieja.
 *
 * Tiene que ser el par y no solo la clave. `pallets.new` y `messages.new` se
 * llaman igual y son botones de texto que **sí** conservan su signo, porque no
 * llevan icono que lo dibuje. */
function paresDeAcciones(): Set<string> {
  const pares = new Set<string>()
  const recorrer = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, e.name)
      if (e.isDirectory()) { recorrer(ruta); continue }
      if (e.name !== "page.tsx") continue

      const fuente = fs.readFileSync(ruta, "utf-8")
      // Cada página declara su sección con `const t = dict.dashboard.<sección>`.
      const seccion = fuente.match(/const t = dict\.dashboard\.([a-z_]+)/)?.[1]
      if (!seccion) continue

      for (const m of fuente.matchAll(/<PageAction[\s\S]{0,400}?label=\{([^}]+)\}/g)) {
        for (const k of m[1].matchAll(/\bt\.([a-z_]+)/g)) pares.add(`${seccion}.${k[1]}`)
      }
    }
  }
  recorrer(APP)
  return pares
}

function valoresConSigno(dict: Record<string, unknown>, pares: Set<string>): string[] {
  const encontrados: string[] = []
  const secciones = (dict as { dashboard: Record<string, unknown> }).dashboard
  for (const [sec, valor] of Object.entries(secciones)) {
    if (typeof valor !== "object" || valor === null) continue
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      if (pares.has(`${sec}.${k}`) && typeof v === "string" && v.trim().startsWith("+")) {
        encontrados.push(`${sec}.${k} = ${v}`)
      }
    }
  }
  return encontrados
}

describe("etiquetas de acción", () => {
  it("no repiten el signo que ya dibuja el icono", () => {
    const pares = paresDeAcciones()
    expect(pares.size).toBeGreaterThan(0)

    expect(valoresConSigno(es, pares)).toEqual([])
    expect(valoresConSigno(en, pares)).toEqual([])
  })
})
