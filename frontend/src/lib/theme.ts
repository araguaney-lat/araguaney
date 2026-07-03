import "server-only"
import { cookies } from "next/headers"

export type Theme = "light" | "dark"
export const THEMES: Theme[] = ["light", "dark"]
export const DEFAULT_THEME: Theme = "light"
export const THEME_COOKIE = "theme"

export function isTheme(v: string): v is Theme {
  return THEMES.includes(v as Theme)
}

export async function getTheme(): Promise<Theme> {
  const jar = await cookies()
  const val = jar.get(THEME_COOKIE)?.value
  return val && isTheme(val) ? val : DEFAULT_THEME
}
