import { SITE_URL, DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo"

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

export const ORGANIZATION_SCHEMA: Schema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Araguaney",
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  description:
    "El estándar común para la coordinación de centros de acopio y la logística de ayuda humanitaria.",
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
}

interface ArticleInput {
  title: string
  description: string
  path: string
}

export function articleSchema({ title, description, path }: ArticleInput): Schema {
  const url = absoluteUrl(path)
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    inLanguage: "es",
    isAccessibleForFree: true,
    image: DEFAULT_OG_IMAGE,
    author: PUBLISHER,
    publisher: PUBLISHER,
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
}

export function howToSchema({ name, description, path, steps }: HowToInput): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    url: absoluteUrl(path),
    inLanguage: "es",
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
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
): Schema {
  const url = absoluteUrl(path)
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name,
    url,
    inLanguage: "es",
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
