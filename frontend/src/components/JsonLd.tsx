import type { Schema } from "@/lib/structured-data"

interface JsonLdProps {
  data: Schema | Schema[]
}

// Renders schema.org JSON-LD in a script tag. Centralizes the
// dangerouslySetInnerHTML so pages just pass builder output.
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
