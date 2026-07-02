import Link from "next/link"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import type { Dictionary, Locale } from "@/lib/i18n"
import type { LegalBlock, LegalDoc as LegalDocData } from "@/content/legal/types"

interface Props {
  dict: Dictionary
  locale: Locale
  /** ES↔EN counterpart URLs so the language switcher navigates, not flips a cookie. */
  localeLinks: Partial<Record<Locale, string>>
  doc: LegalDocData
}

function Block({ block, index }: { block: LegalBlock; index: number }) {
  if (typeof block === "string") {
    return (
      <p className="text-[14px] md:text-[15.5px]" style={{ color: "#5C5347", lineHeight: 1.7, margin: "0 0 16px" }}>
        {block}
      </p>
    )
  }

  if ("subheading" in block) {
    return (
      <h3
        className="text-[15px] md:text-[17px]"
        style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723", margin: "22px 0 10px" }}
      >
        {block.subheading}
      </h3>
    )
  }

  if ("emphasis" in block) {
    return (
      <div
        style={{
          padding: "14px 16px",
          background: "#F6F8FB",
          border: "1px solid #E3EDF5",
          borderRadius: 12,
          color: "#3F576B",
          lineHeight: 1.6,
          margin: "0 0 16px",
        }}
        className="text-[13.5px] md:text-[14.5px]"
      >
        {block.emphasis}
      </div>
    )
  }

  if ("list" in block) {
    return (
      <ul style={{ margin: "0 0 16px", paddingLeft: 20 }}>
        {block.list.map((item, i) => (
          <li
            key={i}
            className="text-[14px] md:text-[15.5px]"
            style={{ color: "#5C5347", lineHeight: 1.65, marginBottom: 7, listStyle: "disc" }}
          >
            {item}
          </li>
        ))}
      </ul>
    )
  }

  // table
  return (
    <div style={{ overflowX: "auto", margin: "0 0 18px" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13.5 }}>
        <thead>
          <tr>
            {block.table.head.map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: "left",
                  padding: "9px 12px",
                  background: "#F4EEE0",
                  color: "#52493D",
                  fontWeight: 700,
                  borderBottom: "1px solid #E6DCC8",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: "9px 12px",
                    color: "#5C5347",
                    lineHeight: 1.5,
                    borderBottom: "1px solid #EFE7D6",
                    verticalAlign: "top",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LegalDoc({ dict, locale, localeLinks, doc }: Props) {
  return (
    <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <HomeNav dict={dict.nav} locale={locale} localeLinks={localeLinks} />
      <div className="h-[56px] md:hidden" />

      <article className="flex-1 px-5 md:px-[46px] py-8 md:py-[56px]">
        <div className="max-w-[760px] mx-auto">
          <h1
            className="text-[28px] md:text-[40px] mb-3"
            style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.12, letterSpacing: "-0.3px", margin: "0 0 12px" }}
          >
            {doc.title}
          </h1>

          <p className="text-[12.5px] md:text-[13px]" style={{ color: "#8A7F6D", margin: "0 0 24px" }}>
            {doc.versionLabel} {doc.version} · {doc.updatedPrefix}{" "}
            <time dateTime={doc.updatedISO}>{doc.updatedLabel}</time>
          </p>

          <p className="text-[15px] md:text-[16.5px]" style={{ color: "#4A4236", lineHeight: 1.65, margin: "0 0 32px" }}>
            {doc.intro}
          </p>

          {doc.sections.map((section, si) => (
            <section key={si} style={{ marginBottom: 30 }}>
              <h2
                className="text-[19px] md:text-[24px]"
                style={{
                  fontFamily: "var(--font-source-serif)",
                  fontWeight: 600,
                  color: "#2B2723",
                  margin: "0 0 14px",
                  paddingTop: 6,
                }}
              >
                {si + 1}. {section.heading}
              </h2>
              {section.blocks.map((block, bi) => (
                <Block key={bi} block={block} index={bi} />
              ))}
            </section>
          ))}

          <div style={{ borderTop: "1px solid #EFE7D6", paddingTop: 18, marginTop: 8 }}>
            <Link href="/" style={{ fontSize: 13.5, color: "#1F5E8C", fontWeight: 600 }}>
              ← Araguaney
            </Link>
          </div>
        </div>
      </article>

      <HomeFooter dict={dict.footer} locale={locale} />
    </div>
  )
}
