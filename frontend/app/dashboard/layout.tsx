import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"
import { CenterSelector } from "@/components/CenterSelector"
import { getLocale, getDictionary } from "@/lib/i18n"
import type { CenterRole } from "@/types"

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

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.mustChangePassword) redirect("/change-password")

  const centerRole = (session.centerRole as CenterRole | null) ?? null
  const platformRole = session.platformRole ?? null
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  const me = await fetchMe(session.accessToken)
  const userName = me?.full_name ?? me?.username ?? null
  const userEmail = me?.email ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <div className="flex h-full flex-col">
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
        />
      </div>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
