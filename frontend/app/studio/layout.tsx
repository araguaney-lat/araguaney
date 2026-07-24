import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { StudioSidebar } from "@/components/StudioSidebar"
import { DictionaryProvider } from "@/context/DictionaryContext"
import { ThemeProvider } from "@/context/ThemeContext"
import { getLocale, getDictionary } from "@/lib/i18n"
import { getTheme } from "@/lib/theme"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

async function fetchMe(token: string): Promise<{ full_name?: string | null; username?: string; email?: string } | null> {
  try {
    const res = await fetch(`${API_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.mustChangePassword) redirect("/change-password")
  if (session.mustAcceptTerms) redirect("/accept-terms")
  if (session.platformRole !== "superadmin") redirect("/dashboard")

  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const theme = await getTheme()

  const me = await fetchMe(session.accessToken)
  const userName = me?.full_name ?? me?.username ?? null
  const userEmail = me?.email ?? null

  return (
    <DictionaryProvider dict={dict}>
      <ThemeProvider theme={theme}>
        <div data-theme={theme} className="flex h-screen overflow-hidden bg-app text-tx">
          <StudioSidebar
            userName={userName}
            userEmail={userEmail}
            nav={dict.studio.nav}
            locale={locale}
            theme={theme}
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </ThemeProvider>
    </DictionaryProvider>
  )
}
