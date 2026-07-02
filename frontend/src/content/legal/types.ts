// Data-driven legal documents (Aviso de Privacidad / Términos).
//
// Keeping each document as structured data (instead of hand-written JSX per
// language) means the ES and EN versions stay structurally identical and the
// single renderer in components/legal/LegalDoc.tsx controls all styling.

export interface LegalTable {
  head: string[]
  rows: string[][]
}

/**
 * A block of content inside a section. A plain string is a paragraph; the
 * object forms cover the small set of structures these documents need.
 * `emphasis` renders a highlighted callout (used for the liability limit and
 * the "no PII" stance).
 */
export type LegalBlock =
  | string
  | { subheading: string }
  | { list: string[] }
  | { table: LegalTable }
  | { emphasis: string }

export interface LegalSection {
  heading: string
  blocks: LegalBlock[]
}

export interface LegalDoc {
  /** Page <h1> and <title>. */
  title: string
  /** Semantic version, bumped when the document materially changes. */
  version: string
  /** ISO date of last update (YYYY-MM-DD) — machine-readable. */
  updatedISO: string
  /** Localized "last updated" date for display (e.g. "2 de julio de 2026"). */
  updatedLabel: string
  /** Localized label for the version line (e.g. "Versión" / "Version"). */
  versionLabel: string
  /** Localized label preceding the date (e.g. "Última actualización"). */
  updatedPrefix: string
  /** Short lead paragraph shown under the title. */
  intro: string
  sections: LegalSection[]
}
