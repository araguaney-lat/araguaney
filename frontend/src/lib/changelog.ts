import type { Locale } from "@/lib/routes"

// Curated public changelog for /novedades. Append a new entry (at the top —
// newest first) whenever a user-facing feature or notable improvement ships.
// This freshness cadence is what keeps the page valuable (Fase 17 task 16).
// Dates are ISO yyyy-mm-dd; formatting is reused from content-dates.ts.

export interface ChangelogText {
  title: string
  body: string
}

export type ChangelogTag = "new" | "improvement" | "fix"

export interface ChangelogEntry {
  date: string
  tag: ChangelogTag
  es: ChangelogText
  en: ChangelogText
}

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    date: "2026-07-24",
    tag: "new",
    es: {
      title: "Panel de entregas de correo",
      body: "Los administradores ahora ven los correos que rebotan o fallan, con la posibilidad de reenviarlos. Menos invitaciones y avisos perdidos en el camino.",
    },
    en: {
      title: "Email deliverability panel",
      body: "Admins can now see emails that bounce or fail, with the option to resend them. Fewer invitations and notices lost along the way.",
    },
  },
  {
    date: "2026-07-20",
    tag: "new",
    es: {
      title: "Auto-registro de centros con aprobación",
      body: "Un centro puede solicitar sumarse desde la web; el equipo revisa la solicitud y, al aprobarla, le da acceso como coordinador. Sumar centros ya no depende de crearlos a mano.",
    },
    en: {
      title: "Center self-registration with approval",
      body: "A center can request to join from the web; the team reviews the request and, on approval, grants coordinator access. Adding centers no longer depends on creating them by hand.",
    },
  },
  {
    date: "2026-07-15",
    tag: "new",
    es: {
      title: "Reportes de campaña",
      body: "Resúmenes por campaña de lo recibido, empacado y enviado, exportables para compartir con aliados y donantes institucionales.",
    },
    en: {
      title: "Campaign reports",
      body: "Per-campaign summaries of what was received, packed and shipped, exportable to share with partners and institutional donors.",
    },
  },
  {
    date: "2026-07-14",
    tag: "new",
    es: {
      title: "Mensajería entre usuarios",
      body: "Coordinadores y voluntarios pueden comunicarse dentro de la plataforma, con avisos por correo, para coordinar sin salir a otras apps.",
    },
    en: {
      title: "Messaging between users",
      body: "Coordinators and volunteers can communicate inside the platform, with email notices, to coordinate without leaving for other apps.",
    },
  },
  {
    date: "2026-07-12",
    tag: "new",
    es: {
      title: "Transferencias entre centros",
      body: "Un centro puede transferir inventario a otro; al confirmarse la recepción, el stock de ambos se actualiza automáticamente. Menos duplicación, mejor reparto.",
    },
    en: {
      title: "Transfers between centers",
      body: "A center can transfer inventory to another; once receipt is confirmed, both centers' stock updates automatically. Less duplication, better distribution.",
    },
  },
  {
    date: "2026-07-06",
    tag: "new",
    es: {
      title: "Etiquetas QR y manifiesto exportable",
      body: "Cada caja homogénea se sella con un QR y su etiqueta, y cada envío genera un manifiesto / packing list exportable listo para aduana — sin recaptura manual.",
    },
    en: {
      title: "QR labels and exportable manifest",
      body: "Every homogeneous box is sealed with a QR code and its label, and each shipment produces an exportable manifest / packing list ready for customs — with no manual re-entry.",
    },
  },
  {
    date: "2026-07-05",
    tag: "new",
    es: {
      title: "Panel nacional agregado",
      body: "Un panel que suma en tiempo real el stock de todos los centros conectados: qué hay, cuánto y dónde. La base para coordinar a nivel nacional.",
    },
    en: {
      title: "Aggregated national dashboard",
      body: "A dashboard that adds up, in real time, the stock of every connected center: what there is, how much, and where. The basis for coordinating nationally.",
    },
  },
]

export function tagLabel(tag: ChangelogTag, locale: Locale): string {
  const labels: Record<ChangelogTag, { es: string; en: string }> = {
    new: { es: "Nuevo", en: "New" },
    improvement: { es: "Mejora", en: "Improvement" },
    fix: { es: "Corrección", en: "Fix" },
  }
  return labels[tag][locale]
}
