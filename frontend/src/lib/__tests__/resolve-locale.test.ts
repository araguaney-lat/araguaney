import { describe, expect, it } from "vitest"
import { DEFAULT_LOCALE, LOCALES, resolveLocale } from "../routes"

/* El segmento `[lang]` casa con cualquier ruta de un solo tramo.
 *
 * `/favicon.svg` es la que más llega, porque los navegadores la piden sin que
 * nadie la enlace, y el diccionario la recibía como si fuera un idioma. No
 * rompía ninguna página —el layout valida y responde 404 igual—, pero cada
 * petición dejaba una excepción: 94 en una semana, suficientes para enterrar un
 * fallo real que sí tenía a gente sin poder trabajar.
 *
 * Lo que se prueba aquí no es el 404, que ya estaba, sino que pedir un idioma
 * inexistente deje de ser una excepción.
 */

describe("resolveLocale", () => {
  it("devuelve el idioma tal cual cuando existe", () => {
    for (const locale of LOCALES) {
      expect(resolveLocale(locale)).toBe(locale)
    }
  })

  it("cae al idioma por defecto ante un tramo que no es idioma", () => {
    // La lista no es hipotética: son rutas que los navegadores y rastreadores
    // piden solos contra la raíz del sitio.
    for (const ruta of [
      "favicon.svg",
      "favicon.ico",
      "apple-touch-icon.png",
      "robots933456.txt",
      "wp-login.php",
    ]) {
      expect(resolveLocale(ruta)).toBe(DEFAULT_LOCALE)
    }
  })

  it("tolera la ausencia del segmento", () => {
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE)
    expect(resolveLocale("")).toBe(DEFAULT_LOCALE)
  })

  it("no acepta un idioma con otra caja ni con región", () => {
    // Si algún día se quieren admitir, se normalizan a propósito y no por
    // accidente: `es-MX` no es `es` mientras el mapa de rutas no lo diga.
    expect(resolveLocale("ES")).toBe(DEFAULT_LOCALE)
    expect(resolveLocale("es-MX")).toBe(DEFAULT_LOCALE)
  })
})
