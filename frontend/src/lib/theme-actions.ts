"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { isTheme, THEME_COOKIE } from "@/lib/theme"

export async function setTheme(theme: string) {
  if (!isTheme(theme)) return
  const jar = await cookies()
  jar.set(THEME_COOKIE, theme, { path: "/", maxAge: 60 * 60 * 24 * 365 })
  revalidatePath("/dashboard")
}
