import {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  BRAND_SAME_AS,
  BRAND_FOUNDING_YEAR,
  FOUNDER,
  LICENSE_URL,
  SOURCE_REPO_URL,
} from "@/lib/seo"
import type { Locale } from "@/lib/routes"

// JSON-LD structured-data builders (schema.org). Emitted via <JsonLd /> so
// Google gets rich results and AI crawlers get machine-readable context.
// Every builder returns a plain object ready to JSON.stringify — no side
// effects, no mutation of inputs.

export type Schema = Record<string, unknown>

const PUBLISHER: Schema = {
  "@type": "Organization",
  name: "Araguaney",
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
}

// @id estables a nivel de host: el mismo nodo se referencia desde /nosotros,
// /en/about y cada guía, en vez de crear una entidad nueva por página.
export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const FOUNDER_ID = `${SITE_URL}/#founder`

// Referencia ligera al Person. Los consumidores que solo necesitan apuntar al
// autor (Organization.founder, Article.author) usan esto; el nodo completo lo
// emite /nosotros vía founderPersonSchema.
const FOUNDER_REF: Schema = { "@type": "Person", "@id": FOUNDER_ID, name: FOUNDER.name }

export function founderPersonSchema(locale: Locale): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": FOUNDER_ID,
    name: FOUNDER.name,
    url: FOUNDER.url,
    jobTitle: FOUNDER.jobTitle[locale],
    sameAs: [...FOUNDER.sameAs],
    worksFor: { "@id": ORGANIZATION_ID },
  }
}

export const ORGANIZATION_SCHEMA: Schema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "Araguaney",
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  description:
    "El estándar común para la coordinación de centros de acopio y la logística de ayuda humanitaria.",
  foundingDate: BRAND_FOUNDING_YEAR,
  founder: FOUNDER_REF,
  knowsAbout: [
    "Centros de acopio",
    "Donaciones en especie",
    "Logística humanitaria",
    "Gestión de inventario de emergencia",
    "Donación de medicamentos",
    "Manifiestos y packing lists",
  ],
  areaServed: [
    { "@type": "Place", name: "América Latina" },
    { "@type": "Country", name: "México" },
    { "@type": "Country", name: "Venezuela" },
    { "@type": "Country", name: "Colombia" },
    { "@type": "Country", name: "Chile" },
    { "@type": "Country", name: "Perú" },
    { "@type": "Country", name: "Argentina" },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: absoluteUrl("/contacto"),
    availableLanguage: ["es", "en"],
  },
  // Only emitted once at least one official profile / Wikidata entity exists.
  ...(BRAND_SAME_AS.length > 0 ? { sameAs: [...BRAND_SAME_AS] } : {}),
}

export const SOFTWARE_APPLICATION_SCHEMA: Schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Araguaney",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "In-kind donation management for aid centers: item-level intake, homogeneous boxes with QR codes, pallets and shipments with an exportable manifest.",
  url: SITE_URL,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  // Software libre: `license` + `isAccessibleForFree` distinguen "gratis" de
  // "abierto" — son dos promesas distintas y ambas verificables.
  license: LICENSE_URL,
  isAccessibleForFree: true,
  codeRepository: SOURCE_REPO_URL,
}

// AboutPage for /nosotros — marks it as the entity home and links it to the
// Organization (which carries sameAs / founder / foundingDate).
export function aboutPageSchema({ path, locale }: { path: string; locale: Locale }): Schema {
  const url = absoluteUrl(path)
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url,
    inLanguage: locale,
    mainEntity: { "@type": "Organization", name: "Araguaney", url: SITE_URL },
  }
}

interface ArticleInput {
  title: string
  description: string
  path: string
  locale: Locale
  datePublished?: string
  dateModified?: string
}

export function articleSchema({
  title,
  description,
  path,
  locale,
  datePublished,
  dateModified,
}: ArticleInput): Schema {
  const url = absoluteUrl(path)
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    inLanguage: locale,
    isAccessibleForFree: true,
    image: DEFAULT_OG_IMAGE,
    // Persona escribe, marca publica — es la separación que Google espera para
    // señales de autoría (E-E-A-T).
    author: FOUNDER_REF,
    publisher: PUBLISHER,
    // Freshness signals — Google shows them and AI engines weight recency.
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
  }
}

interface HowToStep {
  name: string
  text: string
}

interface HowToInput {
  name: string
  description: string
  path: string
  steps: readonly HowToStep[]
  locale: Locale
  datePublished?: string
  dateModified?: string
}

export function howToSchema({
  name,
  description,
  path,
  steps,
  locale,
  datePublished,
  dateModified,
}: HowToInput): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    url: absoluteUrl(path),
    inLanguage: locale,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
  }
}

interface Faq {
  q: string
  a: string
}

export function faqSchema(faqs: readonly Faq[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    // Voice-assistant hint: the FAQ questions/answers are the speakable parts.
    // Selectors match the classes FaqSection renders (any page showing FAQs via
    // FaqSection). Harmless where those elements aren't present.
    speakable: { "@type": "SpeakableSpecification", cssSelector: [".faq-q", ".faq-a"] },
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  }
}

interface DefinedTerm {
  term: string
  definition: string
}

export function definedTermSetSchema(
  name: string,
  path: string,
  terms: readonly DefinedTerm[],
  locale: Locale,
): Schema {
  const url = absoluteUrl(path)
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name,
    url,
    inLanguage: locale,
    hasDefinedTerm: terms.map((entry) => ({
      "@type": "DefinedTerm",
      name: entry.term,
      description: entry.definition,
      inDefinedTermSet: url,
    })),
  }
}

interface Crumb {
  name: string
  path: string
}

export function breadcrumbSchema(crumbs: readonly Crumb[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

interface EventInput {
  name: string
  description: string
  path: string
  startDate: string
  endDate?: string | null
  destinationCountry?: string | null
}

// Only build an Event when a startDate exists — Google requires startDate
// (and rejects an Event without it), so callers must guard on that field and
// fall back to breadcrumb-only structured data when the campaign has no dates.
export function eventSchema({
  name,
  description,
  path,
  startDate,
  endDate,
  destinationCountry,
}: EventInput): Schema {
  const schema: Schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    url: absoluteUrl(path),
    startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    organizer: { "@type": "Organization", name: "Araguaney", url: SITE_URL },
    image: DEFAULT_OG_IMAGE,
  }
  if (endDate) schema.endDate = endDate
  schema.location = destinationCountry
    ? { "@type": "Place", name: destinationCountry, address: destinationCountry }
    : { "@type": "VirtualLocation", url: absoluteUrl(path) }
  return schema
}
