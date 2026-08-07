/* Gasto diario de IA (Fase 23, task 3).
 *
 * Barras en CSS y no una librería de gráficos: son treinta y un valores en una
 * sola serie, y lo único que hay que ver es si un día se sale de la fila. Un
 * gráfico interactivo aquí añadiría JavaScript al cliente para responder la
 * misma pregunta.
 *
 * Es un componente de servidor: no tiene estado ni interacción. */

interface DailySpend {
  day: string
  cost_usd: number
  calls: number
}

export function AISpendChart({
  daily,
  emptyLabel,
}: {
  daily: DailySpend[]
  emptyLabel: string
}) {
  if (daily.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
        {emptyLabel}
      </div>
    )
  }

  // La escala es relativa al día más caro: lo que importa es la forma de la
  // serie, no el valor absoluto, que ya está en la tarjeta de arriba.
  const peak = Math.max(...daily.map((d) => d.cost_usd)) || 1

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex h-32 items-end gap-1">
        {daily.map((d) => (
          <div
            key={d.day}
            className="flex-1 rounded-t bg-blue-400 transition-colors hover:bg-blue-500"
            style={{ height: `${Math.max(2, (d.cost_usd / peak) * 100)}%` }}
            title={`${d.day} · $${d.cost_usd.toFixed(4)} · ${d.calls}`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-zinc-400">
        <span>{daily[0].day}</span>
        <span>{daily[daily.length - 1].day}</span>
      </div>
    </div>
  )
}
