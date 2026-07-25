export interface FaqItem {
  q: string
  a: string
}

interface FaqSectionProps {
  items: readonly FaqItem[]
  title?: string
}

// Visible FAQ block, styled to match the guides. Pair it with faqSchema(items)
// + <JsonLd> in the page for the FAQPage rich result.
export function FaqSection({ items, title = "Preguntas frecuentes" }: FaqSectionProps) {
  return (
    <div className="max-w-[680px] mx-auto">
      <h2
        className="text-[22px] md:text-[26px] mb-6"
        style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 24px" }}
      >
        {title}
      </h2>
      <div className="space-y-5">
        {items.map((item) => (
          <div key={item.q}>
            <h3
              className="faq-q text-[15px] md:text-[16px] mb-1.5"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723" }}
            >
              {item.q}
            </h3>
            <p className="faq-a text-[14px]" style={{ color: "#6E6557", lineHeight: 1.6, margin: 0 }}>
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
