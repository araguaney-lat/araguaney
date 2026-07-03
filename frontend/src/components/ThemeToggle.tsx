"use client"

import { useTransition } from "react"
import { setTheme } from "@/lib/theme-actions"
import type { Theme } from "@/lib/theme"

interface ThemeToggleProps {
  theme: Theme
  collapsed?: boolean
}

export function ThemeToggle({ theme, collapsed }: ThemeToggleProps) {
  const [isPending, startTransition] = useTransition()
  const next: Theme = theme === "light" ? "dark" : "light"

  function handleSwitch() {
    startTransition(async () => {
      await setTheme(next)
    })
  }

  return (
    <button
      onClick={handleSwitch}
      disabled={isPending}
      title={`Cambiar a modo ${next === "dark" ? "oscuro" : "claro"}`}
      className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-medium transition-colors hover:bg-black/5 disabled:opacity-50 ${collapsed ? "justify-center" : ""}`}
    >
      {theme === "light" ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </svg>
      )}
    </button>
  )
}
