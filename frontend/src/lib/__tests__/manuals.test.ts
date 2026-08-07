import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { ALL_SLUGS, MANUAL_GROUPS } from "../../../app/dashboard/ayuda/manuals"

/* El registro de manuales y los archivos tienen que coincidir.
 *
 * `readManualHtml` hace `readFileSync` sin red de seguridad: un slug listado
 * sin su archivo no es un enlace roto, es un 500 en `/dashboard/ayuda/<slug>`.
 * Y un manual traducido a medias deja a quien lee en inglés con una página que
 * existe en el índice y revienta al abrirla. */

const BASE = path.join(process.cwd(), "content", "manuals")

describe("registro de manuales", () => {
  it("cada slug tiene su archivo en español y en inglés", () => {
    const faltantes = ALL_SLUGS.flatMap((slug) => [
      ...(fs.existsSync(path.join(BASE, `${slug}.html`)) ? [] : [`es/${slug}`]),
      ...(fs.existsSync(path.join(BASE, "en", `${slug}.html`)) ? [] : [`en/${slug}`]),
    ])

    expect(faltantes).toEqual([])
  })

  it("no hay manuales escritos que nadie pueda encontrar", () => {
    // Un archivo sin entrada en el registro no aparece en el índice: está
    // escrito, publicado y es inalcanzable salvo tecleando la URL.
    const huerfanos = fs
      .readdirSync(BASE)
      .filter((f) => f.endsWith(".html"))
      .map((f) => f.replace(/\.html$/, ""))
      .filter((slug) => !ALL_SLUGS.includes(slug))

    expect(huerfanos).toEqual([])
  })

  it("cada manual se anuncia en los dos idiomas", () => {
    const sinTraducir = MANUAL_GROUPS.flatMap((g) =>
      g.items.filter((i) => !i.title.es || !i.title.en || !i.blurb.es || !i.blurb.en)
    )

    expect(sinTraducir.map((i) => i.slug)).toEqual([])
  })
})
