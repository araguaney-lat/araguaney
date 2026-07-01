import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"
import { CenterSelector } from "@/components/CenterSelector"
import { getLocale, getDictionary } from "@/lib/i18n"
import type { CenterRole } from "@/types"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.mustChangePassword) redirect("/change-password")

  const centerRole = (session.centerRole as CenterRole | null) ?? null
  const platformRole = session.platformRole ?? null
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <div className="flex h-full flex-col">
        {centerRole === "national_admin" && (
          <CenterSelector token={session.accessToken} />
        )}
        <Sidebar centerRole={centerRole} platformRole={platformRole} nav={dict.dashboard.nav} roleLabels={dict.dashboard.role} />
      </div>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
