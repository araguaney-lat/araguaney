import Image from "next/image"
import Link from "next/link"
import type { Dictionary, Locale } from "@/lib/i18n"
import { localizedPath } from "@/lib/routes"

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

export default function HomeFooter({ dict, locale = "es" }: Props) {
  const legal = LEGAL_LINKS[locale]

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

      <div className="flex flex-col gap-2 md:items-end" style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 12, color: "#A89E8C", lineHeight: 1.55 }}>{dict.privacy}</div>
        <div className="flex items-center gap-4">
          <Link href={localizedPath("nosotros", locale)} style={{ fontSize: 12.5, color: "#E9E2D5", fontWeight: 600 }}>
            {locale === "es" ? "Nosotros" : "About"}
          </Link>
          <span style={{ color: "#5C5347" }}>·</span>
          <Link href={localizedPath("preguntas-frecuentes", locale)} style={{ fontSize: 12.5, color: "#E9E2D5", fontWeight: 600 }}>
            {locale === "es" ? "Preguntas frecuentes" : "FAQ"}
          </Link>
          <span style={{ color: "#5C5347" }}>·</span>
          <Link href={legal.privacy} style={{ fontSize: 12.5, color: "#E9E2D5", fontWeight: 600 }}>
            {dict.privacyLink}
          </Link>
          <span style={{ color: "#5C5347" }}>·</span>
          <Link href={legal.terms} style={{ fontSize: 12.5, color: "#E9E2D5", fontWeight: 600 }}>
            {dict.termsLink}
          </Link>
        </div>
      </div>
    </footer>
  )
}
