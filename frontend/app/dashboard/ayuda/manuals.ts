import fs from "node:fs"
import path from "node:path"

export interface ManualMeta {
  slug: string
  title: string
  blurb: string
}

export interface ManualGroup {
  group: string
  items: ManualMeta[]
}

// Registry of the in-app manuals. Each slug maps to
// content/manuals/<slug>.html (the manual body, styled by ./manual.css).
export const MANUAL_GROUPS: readonly ManualGroup[] = [
  {
    group: "Primeros pasos",
    items: [
      { slug: "overview", title: "Cómo funciona Araguaney", blurb: "El flujo completo, los conceptos, los estados y el mapa de módulos del panel." },
    ],
  },
  {
    group: "Flujo principal",
    items: [
      { slug: "recepcion", title: "Recepción", blurb: "Registrar una donación por ítem." },
      { slug: "cajas", title: "Cajas", blurb: "Sellar cajas e imprimir etiquetas QR." },
      { slug: "tarimas", title: "Tarimas", blurb: "Agrupar cajas selladas y cerrar tarimas." },
      { slug: "envios", title: "Envíos y manifiesto", blurb: "Consolidar tarimas y generar el manifiesto." },
    ],
  },
  {
    group: "Módulos de apoyo",
    items: [
      { slug: "catalogo", title: "Catálogo", blurb: "Los tipos de producto (SKU) y sus atributos." },
      { slug: "campanas", title: "Campañas", blurb: "Organizar donaciones por causa, con página pública." },
      { slug: "centros", title: "Centros", blurb: "Alta y administración de centros de acopio." },
      { slug: "transferencias", title: "Transferencias", blurb: "Mover cajas selladas entre centros." },
      { slug: "escanear", title: "Escanear", blurb: "Leer un QR para ver la ficha de una caja o tarima." },
      { slug: "nacional", title: "Panel Nacional", blurb: "El stock agregado de todos los centros." },
      { slug: "solicitudes", title: "Solicitudes", blurb: "Pedir y resolver, con hilo de mensajes." },
      { slug: "usuarios", title: "Usuarios", blurb: "Crear cuentas, roles y reseteo de contraseña." },
      { slug: "auditoria", title: "Auditoría", blurb: "La bitácora de acciones sensibles." },
      { slug: "reportes", title: "Reportes", blurb: "Resumen por campaña de cuánto se ha reunido." },
    ],
  },
]

const BY_SLUG = new Map<string, ManualMeta>(
  MANUAL_GROUPS.flatMap((g) => g.items.map((i) => [i.slug, i] as const)),
)

export const ALL_SLUGS: readonly string[] = [...BY_SLUG.keys()]

export function getManual(slug: string): ManualMeta | undefined {
  return BY_SLUG.get(slug)
}

// Read the manual body at build time (pages are statically generated).
export function readManualHtml(slug: string): string {
  const file = path.join(process.cwd(), "content", "manuals", `${slug}.html`)
  return fs.readFileSync(file, "utf-8")
}
