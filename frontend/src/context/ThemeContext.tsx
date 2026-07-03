"use client"

import { createContext, useContext } from "react"
import type { Theme } from "@/lib/theme"

const ThemeContext = createContext<Theme | null>(null)

export function ThemeProvider({
  theme,
  children,
}: {
  theme: Theme
  children: React.ReactNode
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}
