import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { StudioSidebar } from "@/components/StudioSidebar"

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
  if (session.platformRole !== "superadmin") redirect("/dashboard")

  const me = await fetchMe(session.accessToken)
  const userName = me?.full_name ?? me?.username ?? null
  const userEmail = me?.email ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <StudioSidebar userName={userName} userEmail={userEmail} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
