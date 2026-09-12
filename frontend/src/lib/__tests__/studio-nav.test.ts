import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
  STUDIO_NAV_ITEMS,
  STUDIO_PRIMARY_HREFS,
  isStudioItemActive,
  studioOverflowItems,
  studioPrimaryItems,
} from "../nav-config"

/* Una sola lista de secciones para los dos menús.
 *
 * El riesgo que estas pruebas cubren no es visual: es que una sección exista en
 * el sidebar de escritorio y **no** en la barra de móvil. Nadie se entera hasta
 * que alguien la busca desde un teléfono y no está.
 */

describe("navegación de studio", () => {
  it("cada sección está en exactamente uno de los dos grupos", () => {
    const fijas = studioPrimaryItems().map((i) => i.href)
    const resto = studioOverflowItems().map((i) => i.href)

    expect([...fijas, ...resto].sort()).toEqual(STUDIO_NAV_ITEMS.map((i) => i.href).sort())
    expect(fijas.filter((h) => resto.includes(h))).toEqual([])
  })

  it("caben en una barra", () => {
    // Cuatro pestañas más el botón "Más". Con más, las etiquetas se cortan y
    // los objetivos táctiles bajan de lo que un pulgar acierta.
    expect(studioPrimaryItems().length).toBeLessThanOrEqual(4)
  })

  it("toda ruta fijada existe en la lista", () => {
    const conocidas = new Set(STUDIO_NAV_ITEMS.map((i) => i.href))
    expect(STUDIO_PRIMARY_HREFS.filter((h) => !conocidas.has(h))).toEqual([])
  })

  it("`/studio` no se marca activa desde sus subrutas", () => {
    const inicio = STUDIO_NAV_ITEMS.find((i) => i.href === "/studio")!
    const ai = STUDIO_NAV_ITEMS.find((i) => i.href === "/studio/ai")!

    expect(isStudioItemActive("/studio", inicio)).toBe(true)
    // Sin `exact`, estar en una subruta encendería también Métricas.
    expect(isStudioItemActive("/studio/ai", inicio)).toBe(false)
    expect(isStudioItemActive("/studio/ai", ai)).toBe(true)
  })

  it("Emails no está en el menú y su página sigue en pie", () => {
    // El panel de Resend cubre lo mismo mejor, así que la entrada se quitó y el
    // webhook se apagó por variable de entorno. La ruta se conserva a
    // propósito: volver tiene que ser encender un interruptor, no reconstruir.
    expect(STUDIO_NAV_ITEMS.map((i) => i.href)).not.toContain("/studio/emails")
    expect(fs.existsSync(path.join(process.cwd(), "app", "studio", "emails", "page.tsx"))).toBe(true)
  })

  it("los dos menús leen la misma lista", () => {
    // La regresión concreta: la barra de móvil nació con su propia copia de las
    // secciones. Dos listas se separan al agregar la primera sección nueva.
    const dir = path.join(process.cwd(), "src", "components")
    for (const archivo of ["StudioSidebar.tsx", "StudioBottomNav.tsx"]) {
      const fuente = fs.readFileSync(path.join(dir, archivo), "utf-8")
      expect(fuente).toContain("@/lib/nav-config")
      expect(fuente).not.toMatch(/href:\s*"\/studio/)
    }
  })
})
