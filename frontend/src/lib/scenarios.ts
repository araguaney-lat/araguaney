// Editorial data for the per-scenario evergreen landing pages
// (/escenarios/[scenario]). Each entry maps a Spanish canonical URL slug to the
// bilingual copy that makes the page substantial. Distinct from /eventos/[slug]
// (ephemeral per-campaign pages): these are evergreen and country-agnostic.
// Shared by the page and the sitemap. See Fase 17 task 11.

export interface ScenarioNeed {
  // Category slug under /necesidades/[category] (see needs-categories.ts). The
  // link label is reused from NEEDS_CATEGORIES so it stays in sync.
  categorySlug: string
  why: { es: string; en: string }
}

export interface ScenarioText {
  label: string
  metaTitle: string
  metaDescription: string
  h1: string
  intro: string
  needsIntro: string
  howHelps: string
}

export interface Scenario {
  slug: string
  emoji: string
  needs: readonly ScenarioNeed[]
  es: ScenarioText
  en: ScenarioText
}

export const SCENARIOS: readonly Scenario[] = [
  {
    slug: "inundaciones",
    emoji: "🌊",
    needs: [
      { categorySlug: "agua", why: { es: "El agua potable es lo primero que falta cuando se contamina el suministro.", en: "Drinking water is the first thing to run short when the supply is contaminated." } },
      { categorySlug: "higiene", why: { es: "Evita brotes por agua estancada y hacinamiento en albergues.", en: "Prevents outbreaks from standing water and crowding in shelters." } },
      { categorySlug: "medicamentos", why: { es: "Para atender heridas, infecciones y enfermedades gastrointestinales.", en: "To treat wounds, infections and gastrointestinal illness." } },
      { categorySlug: "alimentos", why: { es: "No perecederos para familias que perdieron su despensa.", en: "Non-perishables for families that lost their pantry." } },
    ],
    es: {
      label: "Inundaciones",
      metaTitle: "Software para acopio por inundaciones",
      metaDescription:
        "¿Cómo coordinar donaciones tras una inundación? Araguaney estandariza el acopio de agua, higiene, medicamentos y alimentos con cajas homogéneas, QR y manifiesto para envío.",
      h1: "Coordinar donaciones tras una inundación",
      intro:
        "Una inundación desplaza familias, contamina el agua y satura los albergues en horas. La ayuda en especie llega rápido, pero sin orden se pierde. Araguaney pone a los centros de acopio bajo un mismo estándar para que lo donado se registre, se empaque bien y llegue a donde se necesita.",
      needsIntro: "Lo que suele hacer más falta en una inundación:",
      howHelps:
        "Cada donación se registra por ítem con su caducidad, se empaca en cajas homogéneas con QR, y se consolida en envíos con manifiesto exportable. El panel nacional muestra qué hay y dónde, para no duplicar esfuerzos entre centros.",
    },
    en: {
      label: "Floods",
      metaTitle: "Collection software for floods",
      metaDescription:
        "How to coordinate donations after a flood? Araguaney standardizes the intake of water, hygiene, medicine and food with homogeneous boxes, QR codes and a shipping manifest.",
      h1: "Coordinating donations after a flood",
      intro:
        "A flood displaces families, contaminates water and overwhelms shelters within hours. In-kind aid arrives fast, but without order it's wasted. Araguaney puts collection centers under one standard so donations are registered, packed well, and reach where they're needed.",
      needsIntro: "What's usually needed most in a flood:",
      howHelps:
        "Every donation is registered item by item with its expiry, packed into homogeneous boxes with QR codes, and consolidated into shipments with an exportable manifest. The national dashboard shows what's available and where, so centers don't duplicate effort.",
    },
  },
  {
    slug: "incendios",
    emoji: "🔥",
    needs: [
      { categorySlug: "equipo-de-rescate", why: { es: "Para brigadas y evacuación en zonas afectadas por el fuego.", en: "For brigades and evacuation in fire-hit areas." } },
      { categorySlug: "herramientas", why: { es: "Remoción de escombros y limpieza tras el incendio.", en: "Debris removal and cleanup after the fire." } },
      { categorySlug: "higiene", why: { es: "Aseo personal para quienes perdieron todo y están en albergues.", en: "Personal hygiene for those who lost everything and are in shelters." } },
      { categorySlug: "insumos-medicos", why: { es: "Material de curación para quemaduras y lesiones por humo.", en: "Wound-care supplies for burns and smoke injuries." } },
    ],
    es: {
      label: "Incendios",
      metaTitle: "Gestión de donaciones tras un incendio",
      metaDescription:
        "¿Cómo organizar la ayuda tras un incendio? Araguaney coordina el acopio de equipo de rescate, herramientas, higiene e insumos médicos con trazabilidad y manifiesto.",
      h1: "Organizar la ayuda tras un incendio",
      intro:
        "Un incendio deja familias sin hogar y zonas que limpiar y reconstruir. La ayuda útil es muy específica: equipo, herramientas y atención a lesiones. Araguaney ayuda a los centros de acopio a registrar y preparar esa carga con orden, para que llegue completa y a tiempo.",
      needsIntro: "Lo que suele hacer más falta tras un incendio:",
      howHelps:
        "El registro por ítem valida lo que sirve, las cajas homogéneas con QR mantienen la carga trazable, y el manifiesto exportable prepara los envíos. El panel nacional agrega el stock de todos los centros conectados.",
    },
    en: {
      label: "Fires",
      metaTitle: "Managing donations after a fire",
      metaDescription:
        "How to organize aid after a fire? Araguaney coordinates the intake of rescue gear, tools, hygiene and medical supplies with traceability and a manifest.",
      h1: "Organizing aid after a fire",
      intro:
        "A fire leaves families homeless and areas to clear and rebuild. The useful aid is very specific: gear, tools and care for injuries. Araguaney helps collection centers register and prepare that cargo in order, so it arrives complete and on time.",
      needsIntro: "What's usually needed most after a fire:",
      howHelps:
        "Item-level intake validates what's useful, homogeneous boxes with QR codes keep the cargo traceable, and the exportable manifest prepares shipments. The national dashboard aggregates the stock of every connected center.",
    },
  },
  {
    slug: "crisis-migratoria",
    emoji: "🧭",
    needs: [
      { categorySlug: "higiene", why: { es: "Kits de aseo para personas en tránsito prolongado.", en: "Hygiene kits for people in prolonged transit." } },
      { categorySlug: "alimentos", why: { es: "No perecederos fáciles de transportar y repartir.", en: "Non-perishables that are easy to carry and hand out." } },
      { categorySlug: "agua", why: { es: "Hidratación en rutas y puntos de atención.", en: "Hydration along routes and at aid points." } },
      { categorySlug: "medicamentos", why: { es: "Atención básica y continuidad de tratamientos.", en: "Basic care and continuity of treatments." } },
    ],
    es: {
      label: "Crisis migratoria",
      metaTitle: "Logística de ayuda para una crisis migratoria",
      metaDescription:
        "¿Cómo coordinar donaciones en una crisis migratoria? Araguaney estandariza el acopio de higiene, alimentos, agua y medicamentos con cajas homogéneas y manifiesto.",
      h1: "Coordinar ayuda en una crisis migratoria",
      intro:
        "Una crisis migratoria mueve a muchas personas por rutas largas, con necesidades básicas que se repiten en cada punto de atención. Araguaney ayuda a los centros de acopio a estandarizar lo que reciben y a preparar envíos que lleguen ordenados a donde hacen falta.",
      needsIntro: "Lo que suele hacer más falta en una crisis migratoria:",
      howHelps:
        "El estándar común hace que cada centro registre igual, empaque en cajas homogéneas con QR y genere manifiestos. El panel nacional muestra el stock agregado para dirigir la ayuda a los puntos con más necesidad.",
    },
    en: {
      label: "Migration crisis",
      metaTitle: "Aid logistics for a migration crisis",
      metaDescription:
        "How to coordinate donations in a migration crisis? Araguaney standardizes the intake of hygiene, food, water and medicine with homogeneous boxes and a manifest.",
      h1: "Coordinating aid in a migration crisis",
      intro:
        "A migration crisis moves many people along long routes, with basic needs that repeat at every aid point. Araguaney helps collection centers standardize what they receive and prepare shipments that arrive orderly where they're needed.",
      needsIntro: "What's usually needed most in a migration crisis:",
      howHelps:
        "The common standard makes every center register the same way, pack into homogeneous boxes with QR codes and generate manifests. The national dashboard shows aggregated stock to direct aid to the points of greatest need.",
    },
  },
  {
    slug: "sismo",
    emoji: "🌍",
    needs: [
      { categorySlug: "equipo-de-rescate", why: { es: "Búsqueda y rescate en las primeras horas críticas.", en: "Search and rescue in the first critical hours." } },
      { categorySlug: "medicamentos", why: { es: "Atención de heridas, fracturas e infecciones.", en: "Care for wounds, fractures and infections." } },
      { categorySlug: "agua", why: { es: "El suministro suele cortarse tras un terremoto.", en: "The supply is usually cut after an earthquake." } },
      { categorySlug: "herramientas", why: { es: "Remoción de escombros y apuntalamiento.", en: "Debris removal and shoring." } },
    ],
    es: {
      label: "Sismo",
      metaTitle: "Inventario de acopio para un sismo",
      metaDescription:
        "¿Cómo montar el acopio tras un terremoto? Araguaney coordina equipo de rescate, medicamentos, agua y herramientas con registro por ítem, QR y manifiesto para envío.",
      h1: "Montar el acopio tras un terremoto",
      intro:
        "Un sismo exige respuesta inmediata y muy específica: rescate, atención médica y remoción de escombros. En las primeras horas todo llega a la vez y sin control. Araguaney da a los centros de acopio un estándar para registrar, empacar y enviar esa ayuda sin que se atore.",
      needsIntro: "Lo que suele hacer más falta tras un sismo:",
      howHelps:
        "Cada donación se captura por ítem con caducidad y reglas de calidad, se sella en cajas homogéneas con QR, y se consolida en envíos con manifiesto. El panel nacional evita que unos centros acumulen lo que a otros les falta.",
    },
    en: {
      label: "Earthquake",
      metaTitle: "Collection inventory for an earthquake",
      metaDescription:
        "How to set up intake after an earthquake? Araguaney coordinates rescue gear, medicine, water and tools with item-level intake, QR codes and a shipping manifest.",
      h1: "Setting up intake after an earthquake",
      intro:
        "An earthquake demands immediate, very specific response: rescue, medical care and debris removal. In the first hours everything arrives at once and out of control. Araguaney gives collection centers a standard to register, pack and ship that aid without it getting stuck.",
      needsIntro: "What's usually needed most after an earthquake:",
      howHelps:
        "Every donation is captured item by item with expiry and quality rules, sealed into homogeneous boxes with QR codes, and consolidated into shipments with a manifest. The national dashboard keeps some centers from hoarding what others lack.",
    },
  },
]

export function findScenario(slug: string): Scenario | undefined {
  return SCENARIOS.find((entry) => entry.slug === slug)
}
