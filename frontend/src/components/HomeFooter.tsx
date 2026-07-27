import Image from "next/image"
import Link from "next/link"
import type { Dictionary, Locale } from "@/lib/i18n"
import { localizedPath } from "@/lib/routes"
import { SOURCE_REPO_URL } from "@/lib/seo"

const LOGO =
  "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"

// Legal routes are fixed-language pages, so link to the counterpart that
// matches the footer's language.
const LEGAL_LINKS: Record<Locale, { privacy: string; terms: string }> = {
  es: { privacy: "/aviso-de-privacidad", terms: "/terminos" },
  en: { privacy: "/privacy", terms: "/terms" },
}

interface Props {
  dict: Dictionary["footer"]
  locale?: Locale
}

const LINK_STYLE = { fontSize: 12.5, color: "#E9E2D5", fontWeight: 600 } as const

export default function HomeFooter({ dict, locale = "es" }: Props) {
  const legal = LEGAL_LINKS[locale]

  const links: readonly { href: string; label: string; external?: boolean }[] = [
    {
      href: localizedPath("nosotros", locale),
      label: locale === "es" ? "Nosotros" : "About",
    },
    {
      href: localizedPath("preguntas-frecuentes", locale),
      label: locale === "es" ? "Preguntas frecuentes" : "FAQ",
    },
    {
      href: localizedPath("novedades", locale),
      label: locale === "es" ? "Novedades" : "What's new",
    },
    { href: legal.privacy, label: dict.privacyLink },
    { href: legal.terms, label: dict.termsLink },
    { href: SOURCE_REPO_URL, label: "GitHub", external: true },
  ]

  return (
    <footer
      className="px-5 md:px-[46px] py-6 md:py-10 flex items-start md:items-center justify-between gap-4 flex-wrap"
      style={{ background: "#2B2723", color: "#E9E2D5" }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex items-center justify-center overflow-hidden flex-none"
          style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff" }}
        >
          <Image src={LOGO} alt="" width={34} height={34} className="object-contain" />
        </span>
        <div>
          <div
            style={{
              fontFamily: "var(--font-source-serif)",
              fontSize: 18,
              fontWeight: 600,
              color: "#fff",
            }}
          >
            Araguaney
          </div>
          <div className="hidden md:block" style={{ fontSize: 12, color: "#A89E8C", marginTop: 2 }}>
            {dict.tagline}
          </div>
        </div>
      </div>

      {/* min-w-0 + max-w-full keep this column inside the viewport on mobile:
          the links row below grows with every new footer link, and without the
          cap it pushed the document past 390px (horizontal overflow → the
          browser zooms the whole page out). */}
      <div className="flex flex-col gap-2 md:items-end min-w-0 max-w-full">
        <div
          className="md:max-w-[420px]"
          style={{ fontSize: 12, color: "#A89E8C", lineHeight: 1.55 }}
        >
          {dict.privacy}
        </div>
        <div className="flex flex-wrap md:flex-nowrap items-center gap-x-4 gap-y-2 md:justify-end">
          {links.map((link, i) => (
            <span key={link.href} className="flex items-center gap-4">
              {link.external ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>
                  {link.label}
                </a>
              ) : (
                <Link href={link.href} style={LINK_STYLE}>
                  {link.label}
                </Link>
              )}
              {/* Separators only where the row stays on one line (md+): when it
                  wraps they end up dangling at the end of a line. */}
              {i < links.length - 1 && (
                <span className="hidden md:inline" style={{ color: "#5C5347" }} aria-hidden>
                  ·
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </footer>
  )
}
