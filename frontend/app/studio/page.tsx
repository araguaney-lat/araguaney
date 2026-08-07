import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import Link from "next/link"
import { getLocale, getDictionary } from "@/lib/i18n"

interface NationalStats {
  total_centers: number
  active_centers: number
  total_boxes: number
  boxes_by_category: Record<string, number>
}

async function getStats(token: string): Promise<NationalStats | null> {
  try {
    return await apiFetch<NationalStats>("/v1/dashboard/national", { token })
  } catch {
    return null
  }
}

export default async function StudioHubPage() {
  const session = await auth()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.studio.home

  const stats = session?.accessToken ? await getStats(session.accessToken) : null

  const QUICK_LINKS = [
    { href: "/studio/users", label: t.link_users_label, desc: t.link_users_desc },
    { href: "/studio/transfers", label: t.link_transfers_label, desc: t.link_transfers_desc },
    { href: "/studio/ai", label: t.link_ai_label, desc: t.link_ai_desc },
    { href: "/studio/audit", label: t.link_audit_label, desc: t.link_audit_desc },
    { href: "/studio/settings", label: t.link_settings_label, desc: t.link_settings_desc },
  ]

  const STAT_CARDS = stats ? [
    { label: t.stat_active_centers, value: stats.active_centers },
    { label: t.stat_total_centers, value: stats.total_centers },
    { label: t.stat_total_boxes, value: stats.total_boxes },
    { label: t.stat_active_categories, value: Object.keys(stats.boxes_by_category ?? {}).length },
  ] : []

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">{t.title}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t.subtitle}</p>
      </div>

      {STAT_CARDS.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {STAT_CARDS.map((s) => (
            <div key={s.label} className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-2xl font-bold text-blue-900">{s.value}</p>
              <p className="text-xs text-blue-600/80 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all group"
          >
            <p className="font-semibold text-zinc-900 group-hover:text-zinc-700">{link.label}</p>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
