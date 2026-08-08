import { getLocale, getDictionary } from "@/lib/i18n"
import { getAIUsageReport } from "@/lib/ai-usage-actions"
import { AISpendChart } from "@/components/AISpendChart"

/* Panel de gasto de IA (Fase 23, task 3).
 *
 * El riesgo de la fase no es el precio unitario —una sugerencia cuesta
 * centésimas de centavo— sino el volumen sin control. Un bucle mal escrito no
 * aparece en la factura hasta fin de mes, y para entonces ya corrió treinta
 * días. Este panel enseña las tres cosas que hacen falta para cacharlo a
 * tiempo: cuánto va del tope, en qué capacidad, y qué día se disparó.
 *
 * El acceso de superadmin lo controla el layout de `/studio`. */

function money(usd: number): string {
  // Cuatro decimales porque una llamada cuesta centésimas de centavo: con dos,
  // un día entero de uso normal se vería como cero.
  return `$${usd.toFixed(usd < 1 ? 4 : 2)}`
}

export default async function StudioAIPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.studio.ai
  const report = await getAIUsageReport()

  if (!report) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-semibold text-zinc-900">{t.title}</h1>
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-500">{t.unavailable}</p>
        </div>
      </div>
    )
  }

  const budget = report.monthly_budget_usd
  const used = budget > 0 ? Math.min(100, (report.month_spend_usd / budget) * 100) : 0

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">{t.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t.subtitle}</p>
      </div>

      {/* El estado que más rato ahorra: una capacidad puede tener su bandera
          encendida y no responder porque no hay proveedor configurado. */}
      {!report.provider_configured && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t.no_provider}
        </div>
      )}
      {report.budget_exhausted && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {t.exhausted}
        </div>
      )}

      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-3xl font-semibold text-zinc-900">
            {money(report.month_spend_usd)}
          </p>
          <p className="text-sm text-zinc-500">
            {t.of_budget.replace("{budget}", money(budget))}
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${used >= 100 ? "bg-red-500" : "bg-blue-500"}`}
            style={{ width: `${used}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {t.since.replace("{date}", new Date(report.month_start).toLocaleDateString(locale))}
          {" · "}
          {t.model.replace("{model}", report.model)}
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">{t.by_capability}</h2>
        {/* Read-only por diseño: el interruptor real vive en las variables de
            entorno. La nota le dice al operador dónde se cambia, para que el
            panel no se confunda con un control. */}
        <p className="mb-3 text-xs text-zinc-500">{t.by_capability_note}</p>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="px-4 py-2 font-medium">{t.col_capability}</th>
                <th className="px-4 py-2 font-medium">{t.col_switch}</th>
                <th className="px-4 py-2 text-right font-medium">{t.col_calls}</th>
                <th className="px-4 py-2 text-right font-medium">{t.col_tokens}</th>
                <th className="px-4 py-2 text-right font-medium">{t.col_cost}</th>
              </tr>
            </thead>
            <tbody>
              {report.capabilities.map((c) => (
                <tr key={c.capability} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2.5 text-zinc-900">
                    {t.capabilities[c.capability as keyof typeof t.capabilities] ?? c.capability}
                  </td>
                  <td className="px-4 py-2.5">
                    {/* Estado del interruptor, no del uso: cero llamadas con la
                        capacidad encendida y cero con ella apagada piden
                        acciones opuestas. */}
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        c.enabled
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {c.enabled ? t.switch_on : t.switch_off}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">{c.calls}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                    {(c.input_tokens + c.output_tokens).toLocaleString(locale)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900">
                    {money(c.cost_usd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">{t.daily}</h2>
        {/* Mil llamadas repartidas en un mes son uso; mil en una tarde son un
            bucle. El total no distingue esas dos cosas. */}
        <p className="mb-3 text-xs text-zinc-500">{t.daily_note}</p>
        <AISpendChart daily={report.daily} emptyLabel={t.daily_empty} />
      </section>

      {report.top_centers.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">{t.top_centers}</h2>
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
            {report.top_centers.map((c) => (
              <li key={c.center_name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-zinc-700">{c.center_name}</span>
                <span className="tabular-nums text-zinc-900">{money(c.cost_usd)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
