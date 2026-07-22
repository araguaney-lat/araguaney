// Editorial data for the per-category "qué falta" landing pages
// (/necesidades/[category]). Each entry maps a URL slug to a backend category
// enum plus the copy that makes the page substantial (not a thin listing).
// Bilingual (ES/EN): the slug is the Spanish canonical slug and does not change;
// each entry carries the editorial text in both `es` and `en`.
// Shared by the page (render + generateStaticParams) and the sitemap.

export interface NeedsCategoryText {
  label: string
  metaTitle: string
  metaDescription: string
  intro: string
  accepted: readonly string[]
  rejected: readonly string[]
}

export interface NeedsCategory {
  slug: string
  category: string
  emoji: string
  es: NeedsCategoryText
  en: NeedsCategoryText
}

export const NEEDS_CATEGORIES: readonly NeedsCategory[] = [
  {
    slug: "medicamentos",
    category: "MEDICINE",
    emoji: "💊",
    es: {
      label: "Medicamentos",
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
    en: {
      label: "Medicine",
      metaTitle: "What medicine can be donated to a collection center",
      metaDescription:
        "Rules for donating medicine in an emergency: minimum 365 days of shelf life, INN, batch and expiry date required, and what gets rejected under WHO guidelines.",
      intro:
        "Medicine is among the most useful donations and, at the same time, the most tightly regulated. To be shipped and used, it must comply with the WHO Guidelines for Medicine Donations: identification by International Nonproprietary Name (INN), a legible batch and expiry date, and enough remaining shelf life.",
      accepted: [
        "Medicine with a legible INN, batch and expiry date.",
        "At least 365 days of remaining shelf life as of the capture date.",
        "Original, factory-sealed packaging, unopened.",
      ],
      rejected: [
        "Medicine with less than 365 days of shelf life or without a legible expiry date.",
        "Controlled substances (automatically blocked at registration).",
        "Loose medical samples or medicine outside its original packaging.",
      ],
    },
  },
  {
    slug: "insumos-medicos",
    category: "MEDICAL_SUPPLY",
    emoji: "🩺",
    es: {
      label: "Insumos médicos",
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
    en: {
      label: "Medical supplies",
      metaTitle: "What medical supplies can be donated",
      metaDescription:
        "Wound-care material, gloves, syringes and masks to donate in an emergency, classified according to the IFRC/ICRC catalogue.",
      intro:
        "Medical supplies —wound-care, protection and delivery items— are essential for field care. They are classified according to the IFRC/ICRC catalogue, which lets us describe them with a recognized material code on the shipment manifest.",
      accepted: [
        "Wound-care material: gauze, bandages, dressings, unopened.",
        "Protection: gloves, masks, gowns.",
        "Delivery items: sterile syringes and needles in sealed packaging.",
      ],
      rejected: [
        "Supplies that are opened, used or lacking sterile packaging.",
        "Medical equipment requiring calibration or maintenance without documentation.",
      ],
    },
  },
  {
    slug: "alimentos",
    category: "FOOD",
    emoji: "🥫",
    es: {
      label: "Alimentos",
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
    en: {
      label: "Food",
      metaTitle: "What food can be donated to a collection center",
      metaDescription:
        "Non-perishable food to donate in an emergency: minimum 180 days of shelf life, factory-sealed, and what is not accepted.",
      intro:
        "Donated food must be able to be stored and transported without refrigeration and arrive in good condition. That is why only non-perishable, factory-sealed items with enough shelf life are accepted (minimum 180 days, configurable per product).",
      accepted: [
        "Non-perishable: canned goods, grains, pasta, powdered milk.",
        "Factory-sealed, with a legible expiry date.",
        "At least 180 days of remaining shelf life.",
      ],
      rejected: [
        "Perishable items or items requiring refrigeration.",
        "Prepared or bulk food without sealed packaging.",
        "Products without a verifiable expiry date.",
      ],
    },
  },
  {
    slug: "agua",
    category: "WATER",
    emoji: "💧",
    es: {
      label: "Agua",
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
    en: {
      label: "Water",
      metaTitle: "How to donate water in an emergency",
      metaDescription:
        "Factory-sealed bottled water or water jugs to donate at a collection center. What is accepted and what is not.",
      intro:
        "Water is one of the most urgent needs after a disaster. To donate it, the water must be bottled or in jugs and factory-sealed, so that its drinkability is guaranteed during transport.",
      accepted: [
        "Factory-sealed bottled water.",
        "Sealed water jugs, unopened.",
      ],
      rejected: [
        "Containers that are opened or manually refilled.",
        "Water without a factory seal or of unverifiable origin.",
      ],
    },
  },
  {
    slug: "higiene",
    category: "HYGIENE",
    emoji: "🧼",
    es: {
      label: "Higiene",
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
    en: {
      label: "Hygiene",
      metaTitle: "What hygiene items can be donated",
      metaDescription:
        "Soap, toothpaste, sanitary pads and diapers to donate in an emergency. What is accepted, unopened.",
      intro:
        "Hygiene items prevent disease in shelters and affected areas. New, unopened personal-care products in their original packaging are accepted.",
      accepted: [
        "Soap, shampoo, toothpaste and toothbrush.",
        "Sanitary pads and diapers (baby and adult).",
        "Toilet paper and toiletries, unopened.",
      ],
      rejected: [
        "Products that are opened, used or partly used.",
        "Items without original packaging.",
      ],
    },
  },
  {
    slug: "herramientas",
    category: "TOOL",
    emoji: "🔧",
    es: {
      label: "Herramientas",
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
    en: {
      label: "Tools",
      metaTitle: "What tools can be donated in an emergency",
      metaDescription:
        "Shovels, machetes, hard hats and gear for debris removal and reconstruction after a disaster. What is accepted.",
      intro:
        "After an earthquake or a flood, debris removal and reconstruction require tools. Functional tools for field work and construction are accepted.",
      accepted: [
        "Shovels, picks, machetes and wheelbarrows.",
        "Hard hats, work gloves and protective gear.",
        "Functional hand tools in good condition.",
      ],
      rejected: [
        "Broken or incomplete tools.",
        "Power equipment missing its cable or necessary accessories.",
      ],
    },
  },
  {
    slug: "equipo-de-rescate",
    category: "RESCUE_GEAR",
    emoji: "🦺",
    es: {
      label: "Equipo de rescate",
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
    en: {
      label: "Rescue gear",
      metaTitle: "What rescue gear can be donated",
      metaDescription:
        "Vests, flashlights, ropes and emergency gear to donate, aligned with the IOM emergency relief items catalogue.",
      intro:
        "Rescue and emergency gear supports the work of first responders. It aligns with the IOM emergency relief items catalogue, with recognized technical specifications.",
      accepted: [
        "Reflective and flotation vests.",
        "Flashlights, ropes and whistles.",
        "Functional emergency gear in good condition.",
      ],
      rejected: [
        "Damaged gear or gear that does not meet safety specifications.",
        "Used items without a condition check.",
      ],
    },
  },
]

export function findNeedsCategory(slug: string): NeedsCategory | undefined {
  return NEEDS_CATEGORIES.find((entry) => entry.slug === slug)
}

export function slugForCategory(categoryEnum: string): string | undefined {
  return NEEDS_CATEGORIES.find((entry) => entry.category === categoryEnum)?.slug
}
