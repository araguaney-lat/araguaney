import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SessionProvider } from "next-auth/react"
import { Sidebar } from "@/components/Sidebar"
import { CenterSelector } from "@/components/CenterSelector"
import { BottomNav } from "@/components/BottomNav"
import { DictionaryProvider } from "@/context/DictionaryContext"
import { ThemeProvider } from "@/context/ThemeContext"
import { getLocale, getDictionary } from "@/lib/i18n"
import { getTheme } from "@/lib/theme"
import type { CenterRole } from "@/types"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

async function fetchMe(
  token: string
): Promise<{ full_name?: string | null; username?: string; email?: string; avatar_url?: string | null } | null> {
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

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.mustChangePassword) redirect("/change-password")
  if (session.mustAcceptTerms) redirect("/accept-terms")

  const centerRole = (session.centerRole as CenterRole | null) ?? null
  const platformRole = session.platformRole ?? null
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const theme = await getTheme()

  const me = await fetchMe(session.accessToken)
  const userName = me?.full_name ?? me?.username ?? null
  const userEmail = me?.email ?? null
  const userAvatarUrl = me?.avatar_url ?? null

  return (
    <SessionProvider session={session}>
      <DictionaryProvider dict={dict}>
        <ThemeProvider theme={theme}>
          <div data-theme={theme} className="flex h-screen overflow-hidden bg-app text-tx">
            <div className="hidden h-full flex-col md:flex">
              {centerRole === "national_admin" && (
                <CenterSelector token={session.accessToken} />
              )}
              <Sidebar
                centerRole={centerRole}
                platformRole={platformRole}
                nav={dict.dashboard.nav}
                roleLabels={dict.dashboard.role}
                userName={userName}
                userEmail={userEmail}
                userAvatarUrl={userAvatarUrl}
                locale={locale}
                theme={theme}
              />
            </div>
            <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6">{children}</main>
            <BottomNav
              centerRole={centerRole}
              centerSelectorToken={centerRole === "national_admin" ? session.accessToken : null}
              nav={dict.dashboard.nav}
              roleLabels={dict.dashboard.role}
              userName={userName}
              userEmail={userEmail}
              userAvatarUrl={userAvatarUrl}
              locale={locale}
              theme={theme}
            />
          </div>
        </ThemeProvider>
      </DictionaryProvider>
    </SessionProvider>
  )
}
