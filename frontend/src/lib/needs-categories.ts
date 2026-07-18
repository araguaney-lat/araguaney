// Editorial data for the per-category "qué falta" landing pages
// (/necesidades/[category]). Each entry maps a URL slug to a backend category
// enum plus the copy that makes the page substantial (not a thin listing).
// Shared by the page (render + generateStaticParams) and the sitemap.

export interface NeedsCategory {
  slug: string
  category: string
  label: string
  emoji: string
  metaTitle: string
  metaDescription: string
  intro: string
  accepted: readonly string[]
  rejected: readonly string[]
}

export const NEEDS_CATEGORIES: readonly NeedsCategory[] = [
  {
    slug: "medicamentos",
    category: "MEDICINE",
    label: "Medicamentos",
    emoji: "💊",
    metaTitle: "Qué medicamentos se pueden donar en un centro de acopio",
    metaDescription:
      "Reglas para donar medicamentos en una emergencia: vida útil mínima de 365 días, INN, lote y caducidad obligatorios, y qué se rechaza según la OMS.",
    intro:
      "Los medicamentos son de las donaciones más útiles y, a la vez, las más reguladas. Para que puedan enviarse y usarse, deben cumplir los lineamientos de la OMS para donación de medicamentos: identificación por denominación común internacional (INN), lote y caducidad legibles, y una vida útil restante suficiente.",
    accepted: [
      "Medicamentos con INN, lote y fecha de caducidad legibles.",
      "Al menos 365 días de vida útil restante a la fecha de captura.",
      "Empaque original sellado, sin abrir.",
    ],
    rejected: [
      "Medicamentos con menos de 365 días de vida útil o sin caducidad legible.",
      "Sustancias controladas (bloqueadas automáticamente en el registro).",
      "Muestras médicas sueltas o medicamentos fuera de su empaque original.",
    ],
  },
  {
    slug: "insumos-medicos",
    category: "MEDICAL_SUPPLY",
    label: "Insumos médicos",
    emoji: "🩺",
    metaTitle: "Qué insumos médicos se pueden donar",
    metaDescription:
      "Material de curación, guantes, jeringas y mascarillas para donar en una emergencia, clasificados según el catálogo IFRC/ICRC.",
    intro:
      "Los insumos médicos —material de curación, protección y aplicación— son clave para la atención en campo. Se clasifican según el catálogo IFRC/ICRC, lo que permite describirlos con un código de material reconocido en el manifiesto de envío.",
    accepted: [
      "Material de curación: gasas, vendas, apósitos, sin abrir.",
      "Protección: guantes, mascarillas, batas.",
      "Aplicación: jeringas y agujas estériles en empaque sellado.",
    ],
    rejected: [
      "Insumos abiertos, usados o sin empaque estéril.",
      "Equipo médico que requiera calibración o mantenimiento sin documentación.",
    ],
  },
  {
    slug: "alimentos",
    category: "FOOD",
    label: "Alimentos",
    emoji: "🥫",
    metaTitle: "Qué alimentos se pueden donar en un centro de acopio",
    metaDescription:
      "Alimentos no perecederos para donar en una emergencia: vida útil mínima de 180 días, sellados de fábrica, y qué no se acepta.",
    intro:
      "Los alimentos donados deben poder almacenarse y transportarse sin refrigeración y llegar en buen estado. Por eso se aceptan solo no perecederos, sellados de fábrica y con vida útil suficiente (mínimo 180 días, configurable por producto).",
    accepted: [
      "No perecederos: enlatados, granos, pastas, leche en polvo.",
      "Sellados de fábrica, con fecha de caducidad legible.",
      "Al menos 180 días de vida útil restante.",
    ],
    rejected: [
      "Perecederos o que requieran refrigeración.",
      "Alimentos preparados o a granel sin empaque sellado.",
      "Productos sin fecha de caducidad verificable.",
    ],
  },
  {
    slug: "agua",
    category: "WATER",
    label: "Agua",
    emoji: "💧",
    metaTitle: "Cómo donar agua en una emergencia",
    metaDescription:
      "Agua embotellada o en garrafón sellada de fábrica para donar en un centro de acopio. Qué se acepta y qué no.",
    intro:
      "El agua es una de las necesidades más urgentes tras un desastre. Para donarla debe estar embotellada o en garrafón y sellada de fábrica, de modo que su potabilidad esté garantizada durante el transporte.",
    accepted: [
      "Agua embotellada sellada de fábrica.",
      "Garrafones sellados, sin abrir.",
    ],
    rejected: [
      "Envases abiertos o rellenados manualmente.",
      "Agua sin sello de fábrica o de origen no verificable.",
    ],
  },
  {
    slug: "higiene",
    category: "HYGIENE",
    label: "Higiene",
    emoji: "🧼",
    metaTitle: "Qué artículos de higiene se pueden donar",
    metaDescription:
      "Jabón, pasta dental, toallas sanitarias y pañales para donar en una emergencia. Qué se acepta, sin abrir.",
    intro:
      "Los artículos de higiene previenen enfermedades en albergues y zonas afectadas. Se aceptan productos de aseo personal nuevos y sin abrir, en su empaque original.",
    accepted: [
      "Jabón, shampoo, pasta y cepillo dental.",
      "Toallas sanitarias y pañales (bebé y adulto).",
      "Papel higiénico y artículos de aseo, sin abrir.",
    ],
    rejected: [
      "Productos abiertos, usados o a medio usar.",
      "Artículos sin empaque original.",
    ],
  },
  {
    slug: "herramientas",
    category: "TOOL",
    label: "Herramientas",
    emoji: "🔧",
    metaTitle: "Qué herramientas se pueden donar en una emergencia",
    metaDescription:
      "Palas, machetes, cascos y equipo para remoción de escombros y reconstrucción tras un desastre. Qué se acepta.",
    intro:
      "Tras un sismo o una inundación, la remoción de escombros y la reconstrucción requieren herramientas. Se aceptan herramientas funcionales para trabajo de campo y construcción.",
    accepted: [
      "Palas, picos, machetes y carretillas.",
      "Cascos, guantes de trabajo y equipo de protección.",
      "Herramienta manual funcional y en buen estado.",
    ],
    rejected: [
      "Herramienta descompuesta o incompleta.",
      "Equipo eléctrico sin cable o accesorios necesarios.",
    ],
  },
  {
    slug: "equipo-de-rescate",
    category: "RESCUE_GEAR",
    label: "Equipo de rescate",
    emoji: "🦺",
    metaTitle: "Qué equipo de rescate se puede donar",
    metaDescription:
      "Chalecos, linternas, cuerdas y equipo de emergencia para donar, alineado al catálogo IOM de artículos de emergencia.",
    intro:
      "El equipo de rescate y emergencia apoya las labores de los primeros respondientes. Se alinea al catálogo IOM de artículos de emergencia, con especificaciones técnicas reconocidas.",
    accepted: [
      "Chalecos reflectantes y de flotación.",
      "Linternas, cuerdas y silbatos.",
      "Equipo de emergencia funcional y en buen estado.",
    ],
    rejected: [
      "Equipo dañado o que no cumpla especificaciones de seguridad.",
      "Artículos usados sin verificación de estado.",
    ],
  },
]

export function findNeedsCategory(slug: string): NeedsCategory | undefined {
  return NEEDS_CATEGORIES.find((entry) => entry.slug === slug)
}

export function slugForCategory(categoryEnum: string): string | undefined {
  return NEEDS_CATEGORIES.find((entry) => entry.category === categoryEnum)?.slug
}
