"use client"

import { useTransition } from "react"
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

export function LanguageSwitcher({ locale, collapsed }: LanguageSwitcherProps) {
  const [isPending, startTransition] = useTransition()
  const next: Locale = locale === "es" ? "en" : "es"
  const current = FLAGS[locale]
  const nextLang = FLAGS[next]

  function handleSwitch() {
    startTransition(async () => {
      await setLocale(next)
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
