import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { StudioSidebar } from "@/components/StudioSidebar"
import { StudioBottomNav } from "@/components/StudioBottomNav"
import { DictionaryProvider } from "@/context/DictionaryContext"
import { getLocale, getDictionary } from "@/lib/i18n"

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
  // Backend token expired (24h, no refresh) → bounce with a "session expired" notice.
  if (
    session.error === "AccessTokenExpired" ||
    // eslint-disable-next-line react-hooks/purity -- Server Component async; Date.now() se evalúa por petición y la regla de pureza del compilador no aplica aquí
    (session.accessTokenExpires && Date.now() >= session.accessTokenExpires)
  ) {
    redirect("/login?expired=1")
  }
  if (session.mustChangePassword) redirect("/change-password")
  if (session.mustAcceptTerms) redirect("/accept-terms")
  if (session.platformRole !== "superadmin") redirect("/dashboard")

  const locale = await getLocale()
  const dict = await getDictionary(locale)

  const me = await fetchMe(session.accessToken)
  const userName = me?.full_name ?? me?.username ?? null
  const userEmail = me?.email ?? null

  return (
    <DictionaryProvider dict={dict} locale={locale}>
      <div className="flex h-screen overflow-hidden bg-zinc-50">
        {/* La barra lateral es de escritorio; en móvil manda la de abajo, igual
            que en el panel operativo. */}
        <div className="hidden h-full md:flex print:hidden">
          <StudioSidebar
            userName={userName}
            userEmail={userEmail}
            nav={dict.studio.nav}
            locale={locale}
          />
        </div>
        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 md:pb-6">{children}</main>
        <StudioBottomNav
          nav={dict.studio.nav}
          locale={locale}
          userName={userName}
          userEmail={userEmail}
        />
      </div>
    </DictionaryProvider>
  )
}
