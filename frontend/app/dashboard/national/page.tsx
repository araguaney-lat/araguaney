import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { apiFetch } from "@/lib/api"
import type { NationalDashboardOut, ProductCategory } from "@/types"
import { WeightCards } from "@/components/WeightCards"

const CATEGORY_LABELS: Record<string, string> = {
  MEDICINE: "Medicamentos",
  MEDICAL_SUPPLY: "Insumos médicos",
  FOOD: "Alimentos",
  WATER: "Agua",
  HYGIENE: "Higiene",
  TOOL: "Herramientas",
  RESCUE_GEAR: "Equipo de rescate",
  OTHER: "Otros",
}

export default async function NationalDashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  let data: NationalDashboardOut | null = null
  let error: string | null = null

  try {
    data = await apiFetch<NationalDashboardOut>("/v1/dashboard/national", {
      token: session.accessToken,
      next: { revalidate: 120, tags: ["dashboard"] },
    })
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar datos"
  }

  if (error || !data) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-4">Panel nacional</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    )
  }

  const { totals, by_category, by_center, by_inn } = data

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Panel nacional</h1>
        <p className="text-sm text-zinc-500">Stock agregado de todos los centros activos</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Cajas selladas", value: totals.total_boxes_sealed.toLocaleString() },
          { label: "Unidades selladas", value: totals.total_units_sealed.toLocaleString() },
          { label: "Peso total (kg)", value: totals.total_weight_kg.toLocaleString(undefined, { maximumFractionDigits: 1 }) },
          { label: "Recepciones", value: totals.total_intakes.toLocaleString() },
          { label: "Envíos despachados", value: totals.total_shipments_sent.toLocaleString() },
          { label: "Centros activos", value: totals.active_centers.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Stock by category */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">Stock por categoría (sellado)</h2>
        {by_category.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin datos aún.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Categoría</th>
                  <th className="px-4 py-3 text-right font-medium">Cajas</th>
                  <th className="px-4 py-3 text-right font-medium">Unidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {by_category.map((row) => (
                  <tr key={row.category} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-900">
                      {CATEGORY_LABELS[row.category] ?? row.category}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">{row.box_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">{row.total_units.toLocaleString()}</td>
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
          <h2 className="text-base font-semibold text-zinc-900 mb-3">Stock por centro</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Centro</th>
                  <th className="px-4 py-3 text-left font-medium">País / Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Cajas</th>
                  <th className="px-4 py-3 text-right font-medium">Unidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {by_center.map((row) => (
                  <tr key={row.center_id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-900">{row.center_name}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {[row.country_code, row.state_name].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">{row.box_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">{row.total_units.toLocaleString()}</td>
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
          <h2 className="text-base font-semibold text-zinc-900 mb-3">Medicamentos (top por volumen)</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">INN</th>
                  <th className="px-4 py-3 text-left font-medium">Concentración</th>
                  <th className="px-4 py-3 text-left font-medium">Forma</th>
                  <th className="px-4 py-3 text-right font-medium">Cajas</th>
                  <th className="px-4 py-3 text-right font-medium">Unidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {by_inn.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-900 font-medium">{row.inn_name ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-500">{row.strength ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-500">{row.form ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-zinc-600">{row.box_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">{row.total_units.toLocaleString()}</td>
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
