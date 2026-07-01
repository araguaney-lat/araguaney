import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getLocale, getDictionary } from "@/lib/i18n"
import { WeightCards } from "@/components/WeightCards"

export default async function DashboardPage() {
  const session = await auth()
  const centerRole = session?.centerRole

  if (centerRole === "national_admin") {
    redirect("/dashboard/national")
  }

  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.dashboard.home

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">{t.title}</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {centerRole === "coordinator" ? t.subtitle_coordinator : t.subtitle_volunteer}
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {centerRole && ["coordinator", "volunteer"].includes(centerRole) && (
          <>
            <Link href="/dashboard/intake" className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all">
              <p className="text-xs text-zinc-500 mb-1">{t.card_intake_label}</p>
              <p className="font-semibold text-zinc-900">{t.card_intake_action}</p>
            </Link>
            <Link href="/dashboard/boxes" className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all">
              <p className="text-xs text-zinc-500 mb-1">{t.card_boxes_label}</p>
              <p className="font-semibold text-zinc-900">{t.card_boxes_action}</p>
            </Link>
          </>
        )}
        {centerRole === "coordinator" && (
          <>
            <Link href="/dashboard/pallets" className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all">
              <p className="text-xs text-zinc-500 mb-1">{t.card_pallets_label}</p>
              <p className="font-semibold text-zinc-900">{t.card_pallets_action}</p>
            </Link>
            <Link href="/dashboard/shipments" className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all">
              <p className="text-xs text-zinc-500 mb-1">{t.card_shipments_label}</p>
              <p className="font-semibold text-zinc-900">{t.card_shipments_action}</p>
            </Link>
          </>
        )}
      </div>
      <WeightCards />
    </div>
  )
}
