import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { getLocale, getDictionary } from "@/lib/i18n"

// recharts + react-simple-maps are only needed on this page — keep them out
// of the initial JS chunk, loaded on demand instead.
const ReportsDashboard = dynamic(() => import("./ReportsDashboard"))

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

  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.dashboard.reports

  const campaigns = await getMyCampaigns(session.accessToken)
  const defaultCampaign = campaigns[0] ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-tx">{t.title}</h1>
        <p className="text-sm text-mut mt-1">{t.subtitle_campaign}</p>
      </div>
      <ReportsDashboard
        campaigns={campaigns}
        defaultCampaignId={defaultCampaign?.id ?? null}
        centerRole={session.centerRole ?? null}
      />
    </div>
  )
}
