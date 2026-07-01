"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useTransition } from "react"
import { setLocale } from "@/lib/locale-actions"
import type { Locale, Dictionary } from "@/lib/i18n"

const LOGO =
  "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"

interface Props {
  dict: Dictionary["nav"]
  locale: Locale
  /**
   * For fixed-language pages (e.g. /ayuda-humanitaria, /humanitarian-aid) whose
   * content does not follow the cookie-based locale — the switcher navigates to
   * the given URL instead of flipping the locale cookie. If the other locale has
   * no equivalent page (e.g. /centro-de-acopio has no English version), omit its
   * entry and the switcher is hidden.
   */
  localeLinks?: Partial<Record<Locale, string>>
}

const FLAG: Record<Locale, string> = { es: "🇲🇽", en: "🇺🇸" }
const OTHER_LOCALE: Record<Locale, Locale> = { es: "en", en: "es" }

export default function HomeNav({ dict, locale, localeLinks }: Props) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  const other = OTHER_LOCALE[locale]
  const otherHref = localeLinks?.[other]
  const showSwitcher = !localeLinks || otherHref !== undefined

  function switchLocale() {
    startTransition(async () => {
      await setLocale(other)
    })
  }

  const links = [
    { href: "/", label: dict.home },
    { href: "/#por-que", label: dict.why },
    { href: "/#estandares", label: dict.standards },
    { href: "/contacto", label: dict.contact },
  ]

  return (
    <>
      {/* Nav bar — fixed on mobile, sticky on desktop */}
      <nav
        className="fixed md:sticky top-0 left-0 right-0 z-50 md:z-40"
        style={{ background: "#FBF7EE", borderBottom: "1px solid #EFE7D6" }}
      >
        <div className="flex items-center justify-between px-5 md:px-[46px] py-[14px] md:py-5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-[9px] md:gap-[11px]">
            <span
              className="w-8 h-8 md:w-[38px] md:h-[38px] flex items-center justify-center overflow-hidden bg-white flex-none"
              style={{ borderRadius: "50%", border: "1px solid #EADFC4" }}
            >
              <Image
                src={LOGO}
                alt="Araguaney"
                width={34}
                height={34}
                className="object-contain"
              />
            </span>
            <span
              className="text-[18px] md:text-[21px]"
              style={{
                fontFamily: "var(--font-source-serif)",
                fontWeight: 600,
                color: "#2B2723",
              }}
            >
              Araguaney
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-[26px]">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{ fontSize: 14, fontWeight: 400, color: "#52493D" }}
              >
                {l.label}
              </Link>
            ))}

            {/* Language switcher */}
            {showSwitcher && (otherHref ? (
              <Link
                href={otherHref}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors"
                style={{ border: "1.5px solid #EAD9B0", color: "#52493D" }}
                aria-label={`Switch to ${other === "en" ? "English" : "Español"}`}
              >
                <span>{FLAG[other]}</span>
                <span>{other === "en" ? "EN" : "ES"}</span>
              </Link>
            ) : (
              <button
                onClick={switchLocale}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors"
                style={{ border: "1.5px solid #EAD9B0", color: "#52493D" }}
                aria-label={`Switch to ${other === "en" ? "English" : "Español"}`}
              >
                <span>{FLAG[other]}</span>
                <span>{other === "en" ? "EN" : "ES"}</span>
              </button>
            ))}

            <Link
              href="/login"
              className="px-[18px] py-[9px] inline-flex items-center text-[13.5px] font-semibold"
              style={{
                border: "1.5px solid #1F5E8C",
                color: "#1F5E8C",
                borderRadius: 99,
              }}
            >
              {dict.login}
            </Link>
          </div>

          {/* Mobile right side */}
          <div className="md:hidden flex items-center gap-3">
            {showSwitcher && (otherHref ? (
              <Link
                href={otherHref}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold"
                style={{ border: "1.5px solid #EAD9B0", color: "#52493D" }}
                aria-label={`Switch to ${other === "en" ? "English" : "Español"}`}
              >
                <span>{FLAG[other]}</span>
                <span>{other === "en" ? "EN" : "ES"}</span>
              </Link>
            ) : (
              <button
                onClick={switchLocale}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold"
                style={{ border: "1.5px solid #EAD9B0", color: "#52493D" }}
                aria-label={`Switch to ${other === "en" ? "English" : "Español"}`}
              >
                <span>{FLAG[other]}</span>
                <span>{other === "en" ? "EN" : "ES"}</span>
              </button>
            ))}

            <button
              onClick={() => setOpen(true)}
              className="p-1 flex flex-col gap-[5px]"
              aria-label="Menú"
            >
              <span
                style={{
                  width: 20,
                  height: 2,
                  background: "#2B2723",
                  borderRadius: 2,
                  display: "block",
                }}
              />
              <span
                style={{
                  width: 20,
                  height: 2,
                  background: "#2B2723",
                  borderRadius: 2,
                  display: "block",
                }}
              />
              <span
                style={{
                  width: 13,
                  height: 2,
                  background: "#2B2723",
                  borderRadius: 2,
                  display: "block",
                }}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          style={{ background: "rgba(43,39,35,0.45)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[70] md:hidden flex flex-col"
        style={{
          width: 260,
          background: "#FBF7EE",
          boxShadow: "-8px 0 32px rgba(43,39,35,.18)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.26s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-[18px] pb-4"
          style={{ borderBottom: "1px solid #EFE7D6" }}>
          <span
            style={{
              fontFamily: "var(--font-source-serif)",
              fontWeight: 600,
              fontSize: 17,
              color: "#2B2723",
            }}
          >
            Araguaney
          </span>
          <button
            onClick={() => setOpen(false)}
            className="p-1"
            aria-label="Cerrar menú"
            style={{ color: "#52493D" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col px-5 pt-5 gap-0 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-3 text-[15px] font-medium"
              style={{
                color: "#2B2723",
                borderBottom: "1px solid #EFE7D6",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="px-5 pb-8 pt-5 flex flex-col gap-3">
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center py-3 text-[14px] font-semibold rounded-full"
            style={{
              background: "#1F5E8C",
              color: "#fff",
            }}
          >
            {dict.login}
          </Link>
        </div>
      </div>
    </>
  )
}
