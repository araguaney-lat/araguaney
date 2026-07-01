import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { redirect } from "next/navigation"
import ReportsDashboard from "./ReportsDashboard"

interface Campaign {
  id: string
  name: string
}

async function getMyCampaigns(token: string): Promise<Campaign[]> {
  try {
    return await apiFetch<Campaign[]>("/v1/campaigns/my", { token })
  } catch {
    return []
  }
}

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.accessToken) redirect("/login")

  const campaigns = await getMyCampaigns(session.accessToken)
  const defaultCampaign = campaigns[0] ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Reportes</h1>
        <p className="text-sm text-zinc-500 mt-1">Actividad y estadísticas de la campaña</p>
      </div>
      <ReportsDashboard
        campaigns={campaigns}
        defaultCampaignId={defaultCampaign?.id ?? null}
        centerRole={session.centerRole ?? null}
      />
    </div>
  )
}
