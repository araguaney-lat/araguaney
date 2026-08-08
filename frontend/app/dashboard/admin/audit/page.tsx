"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
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

  const LIMIT = 50
  const [filterEntity, setFilterEntity] = useState("")
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<AuditEntry | null>(null)

  // offset vive en la queryKey: paginar o filtrar refetchea solo. Al cambiar el
  // filtro se vuelve a la primera página desde el propio handler del select.
  const auditQuery = useQuery({
    queryKey: ["audit", filterEntity, offset],
    queryFn: () => listAuditAction({ entity_type: filterEntity || undefined, limit: LIMIT, offset }),
  })
  const items = auditQuery.data?.items ?? []
  const total = auditQuery.data?.total ?? 0
  const loading = auditQuery.isPending

  const changePage = (off: number) => setOffset(off)

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-tx">{t.title}</h1>
          <p className="text-sm text-mut mt-0.5">
            {total === 1 ? t.records_count_one : t.records_count_other.replace("{count}", String(total))}
          </p>
        </div>
        <select
          value={filterEntity}
          onChange={(e) => { setFilterEntity(e.target.value); setOffset(0) }}
          className="rounded-lg border border-cardB px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">{t.filter_all}</option>
          {ENTITY_TYPES.map((entity) => <option key={entity} value={entity}>{entity}</option>)}
        </select>
      </div>

      {selected && (
        <div className="mb-4 rounded-xl border border-cardB bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-mut">{t.metadata}</p>
            <button onClick={() => setSelected(null)} className="text-xs text-fnt hover:text-mut">
              {dict.dashboard.common.close}
            </button>
          </div>
          <pre className="text-xs text-mut overflow-auto bg-card2 rounded p-3 max-h-48">
            {JSON.stringify(selected.extra, null, 2)}
          </pre>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-fnt py-8 text-center">{dict.dashboard.common.loading}</div>
      ) : (
        <>
          <div className="rounded-xl border border-cardB bg-card overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-card2 border-b border-cardB">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mut">{t.col_date}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mut">{t.col_action}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mut hidden sm:table-cell">{t.col_entity}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mut hidden md:table-cell">{t.col_ip}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-card2/50">
                    <td className="px-4 py-3 text-xs text-mut whitespace-nowrap">{fmt(entry.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-tx">{entry.action}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-mut">{entry.entity_type}</span>
                      {entry.entity_id && (
                        <span className="ml-1 font-mono text-xs text-fnt">
                          {entry.entity_id.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-fnt">{entry.ip ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {entry.extra && Object.keys(entry.extra).length > 0 && (
                        <button
                          onClick={() => setSelected(entry)}
                          className="rounded px-2 py-1 text-xs text-mut hover:bg-chip"
                        >
                          {t.view}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-fnt text-sm">{t.empty}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {total > LIMIT && (
            <div className="mt-4 flex items-center justify-between text-sm text-mut">
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
                  className="rounded-lg border border-cardB px-3 py-1.5 text-xs hover:bg-card2 disabled:opacity-40"
                >
                  {t.prev}
                </button>
                <button
                  disabled={offset + LIMIT >= total}
                  onClick={() => changePage(offset + LIMIT)}
                  className="rounded-lg border border-cardB px-3 py-1.5 text-xs hover:bg-card2 disabled:opacity-40"
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
