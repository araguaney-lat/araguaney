"use client"

import { useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { setLocale } from "@/lib/locale-actions"
import type { Locale } from "@/lib/i18n"

const FLAGS: Record<Locale, { flag: string; label: string }> = {
  es: { flag: "🇲🇽", label: "Español" },
  en: { flag: "🇺🇸", label: "English" },
}

interface LanguageSwitcherProps {
  locale: Locale
  collapsed?: boolean
}

// Toggle the /en prefix on the current panel path so the URL reflects the locale
// (shareable EN links). ES is unprefixed. setLocale() also persists the choice in
// the cookie so unprefixed in-panel links keep the same locale (sub-3).
function togglePanelPath(pathname: string, next: Locale): string {
  const stripped = pathname.replace(/^\/en(?=\/|$)/, "") || "/"
  return next === "en" ? `/en${stripped === "/" ? "" : stripped}` : stripped
}

export function LanguageSwitcher({ locale, collapsed }: LanguageSwitcherProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()
  const next: Locale = locale === "es" ? "en" : "es"
  const current = FLAGS[locale]
  const nextLang = FLAGS[next]

  function handleSwitch() {
    startTransition(async () => {
      await setLocale(next)
      router.push(togglePanelPath(pathname, next))
    })
  }

  return (
    <button
      onClick={handleSwitch}
      disabled={isPending}
      title={`Switch to ${nextLang.label}`}
      className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-medium transition-colors hover:bg-black/5 disabled:opacity-50 ${collapsed ? "justify-center" : ""}`}
    >
      <span className="text-base leading-none">{current.flag}</span>
      {!collapsed && (
        <span className="text-mut text-[11px]">{locale.toUpperCase()}</span>
      )}
    </button>
  )
}
