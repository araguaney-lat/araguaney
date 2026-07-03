import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { getLocale, getDictionary } from "@/lib/i18n"
import type { NationalDashboardOut } from "@/types"

const DASH = "—"
import { WeightCards } from "@/components/WeightCards"

export default async function NationalDashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.dashboard.national

  let data: NationalDashboardOut | null = null
  let error: string | null = null

  try {
    data = await apiFetch<NationalDashboardOut>("/v1/dashboard/national", {
      token: session.accessToken,
      next: { revalidate: 120, tags: ["dashboard"] },
    })
  } catch (e) {
    error = e instanceof Error ? e.message : dict.dashboard.common.error_unknown
  }

  if (error || !data) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-tx mb-4">{t.title}</h1>
        <div className="rounded-xl bg-dRejB p-4 text-sm text-dRejT">{error}</div>
      </div>
    )
  }

  const { totals, by_category, by_center, by_inn } = data

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-tx mb-1">{t.title}</h1>
        <p className="text-sm text-mut">{t.subtitle}</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: t.stat_boxes_sealed, value: totals.total_boxes_sealed.toLocaleString() },
          { label: t.stat_units_sealed, value: totals.total_units_sealed.toLocaleString() },
          { label: t.stat_weight_kg, value: totals.total_weight_kg.toLocaleString(undefined, { maximumFractionDigits: 1 }) },
          { label: t.stat_intakes, value: totals.total_intakes.toLocaleString() },
          { label: t.stat_shipments_sent, value: totals.total_shipments_sent.toLocaleString() },
          { label: t.stat_centers, value: totals.active_centers.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-goldB bg-goldSoft p-4">
            <p className="text-xs text-sTx mb-1">{label}</p>
            <p className="text-2xl font-bold text-tx">{value}</p>
          </div>
        ))}
      </div>

      {/* Stock by category */}
      <section>
        <h2 className="text-base font-semibold text-tx mb-3">{t.category_heading}</h2>
        {by_category.length === 0 ? (
          <p className="text-sm text-mut">{t.no_data}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-cardB bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-card2 text-xs text-mut">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t.col_category}</th>
                  <th className="px-4 py-3 text-right font-medium">{t.col_boxes}</th>
                  <th className="px-4 py-3 text-right font-medium">{t.col_units}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {by_category.map((row) => (
                  <tr key={row.category} className="hover:bg-card2">
                    <td className="px-4 py-3 text-tx">
                      {t.categories[row.category as keyof typeof t.categories] ?? row.category}
                    </td>
                    <td className="px-4 py-3 text-right text-mut">{row.box_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-tx">{row.total_units.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Stock by center */}
      {by_center.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-tx mb-3">{t.center_heading}</h2>
          <div className="overflow-x-auto rounded-xl border border-cardB bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-card2 text-xs text-mut">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t.col_center}</th>
                  <th className="px-4 py-3 text-left font-medium">{t.col_location}</th>
                  <th className="px-4 py-3 text-right font-medium">{t.col_boxes}</th>
                  <th className="px-4 py-3 text-right font-medium">{t.col_units}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {by_center.map((row) => (
                  <tr key={row.center_id} className="hover:bg-card2">
                    <td className="px-4 py-3 text-tx">{row.center_name}</td>
                    <td className="px-4 py-3 text-fnt text-xs">
                      {[row.country_code, row.state_name].filter(Boolean).join(" / ") || DASH}
                    </td>
                    <td className="px-4 py-3 text-right text-mut">{row.box_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-tx">{row.total_units.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Top medicines by INN */}
      {by_inn.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-tx mb-3">{t.inn_heading}</h2>
          <div className="overflow-x-auto rounded-xl border border-cardB bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-card2 text-xs text-mut">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t.col_inn}</th>
                  <th className="px-4 py-3 text-left font-medium">{t.col_strength}</th>
                  <th className="px-4 py-3 text-left font-medium">{t.col_form}</th>
                  <th className="px-4 py-3 text-right font-medium">{t.col_boxes}</th>
                  <th className="px-4 py-3 text-right font-medium">{t.col_units}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {by_inn.map((row, i) => (
                  <tr key={i} className="hover:bg-card2">
                    <td className="px-4 py-3 text-tx font-medium">{row.inn_name ?? DASH}</td>
                    <td className="px-4 py-3 text-mut">{row.strength ?? DASH}</td>
                    <td className="px-4 py-3 text-mut">{row.form ?? DASH}</td>
                    <td className="px-4 py-3 text-right text-mut">{row.box_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-tx">{row.total_units.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <WeightCards />
    </div>
  )
}
