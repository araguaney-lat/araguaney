"use client"

import { useEffect, useState } from "react"
import { listAuditAction } from "@/lib/studio-actions"
import type { AuditEntry } from "@/lib/studio-actions"
import { useDict } from "@/context/DictionaryContext"

const ENTITY_TYPES = ["user", "box", "pallet", "shipment", "intake", "center", "campaign"]

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })
}

export default function StudioAuditPage() {
  const dict = useDict()
  const t = dict.dashboard.admin_audit

  const [items, setItems] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterEntity, setFilterEntity] = useState("")
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<AuditEntry | null>(null)
  const LIMIT = 50

  async function load(off = 0) {
    setLoading(true)
    const result = await listAuditAction({
      entity_type: filterEntity || undefined,
      limit: LIMIT,
      offset: off,
    })
    setItems(result.items)
    setTotal(result.total)
    setLoading(false)
  }

  useEffect(() => {
    setOffset(0)
    load(0)
  }, [filterEntity]) // eslint-disable-line react-hooks/exhaustive-deps

  function changePage(off: number) {
    setOffset(off)
    load(off)
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{t.title}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {total === 1 ? t.records_count_one : t.records_count_other.replace("{count}", String(total))}
          </p>
        </div>
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">{t.filter_all}</option>
          {ENTITY_TYPES.map((entity) => <option key={entity} value={entity}>{entity}</option>)}
        </select>
      </div>

      {selected && (
        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-zinc-700">{t.metadata}</p>
            <button onClick={() => setSelected(null)} className="text-xs text-zinc-400 hover:text-zinc-600">
              {dict.dashboard.common.close}
            </button>
          </div>
          <pre className="text-xs text-zinc-600 overflow-auto bg-zinc-50 rounded p-3 max-h-48">
            {JSON.stringify(selected.extra, null, 2)}
          </pre>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-zinc-400 py-8 text-center">{dict.dashboard.common.loading}</div>
      ) : (
        <>
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{t.col_date}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{t.col_action}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 hidden sm:table-cell">{t.col_entity}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 hidden md:table-cell">{t.col_ip}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{fmt(entry.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zinc-800">{entry.action}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-zinc-500">{entry.entity_type}</span>
                      {entry.entity_id && (
                        <span className="ml-1 font-mono text-xs text-zinc-400">
                          {entry.entity_id.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-zinc-400">{entry.ip ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {entry.extra && Object.keys(entry.extra).length > 0 && (
                        <button
                          onClick={() => setSelected(entry)}
                          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
                        >
                          {t.view}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400 text-sm">{t.empty}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {total > LIMIT && (
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
              <span>
                {t.pagination
                  .replace("{from}", String(offset + 1))
                  .replace("{to}", String(Math.min(offset + LIMIT, total)))
                  .replace("{total}", String(total))}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => changePage(Math.max(0, offset - LIMIT))}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-40"
                >
                  {t.prev}
                </button>
                <button
                  disabled={offset + LIMIT >= total}
                  onClick={() => changePage(offset + LIMIT)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-40"
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
