import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { StudioSidebar } from "@/components/StudioSidebar"

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.centerRole !== "national_admin") redirect("/dashboard")

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <StudioSidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
