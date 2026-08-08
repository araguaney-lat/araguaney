"use client"

import { Fragment, useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import type { ProductType, Campaign, ProductGtin } from "@/types"
import { promoteProductTypeAction, unlinkProductGtinAction } from "@/lib/catalog-actions"
import { useDict } from "@/context/DictionaryContext"
import { Plus } from "lucide-react"
import { PageAction } from "@/components/PageAction"

type ProductTypeWithCampaign = ProductType & { campaign_id: string | null }

export default function CatalogPage() {
  const dict = useDict()
  const t = dict.dashboard.catalog
  const { data: session } = useSession()
  const isAdmin = session?.centerRole === "national_admin"

  const [products, setProducts] = useState<ProductTypeWithCampaign[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState("")
  const [scopeFilter, setScopeFilter] = useState<"all" | "global" | "campaign">("all")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Codigos de barras por producto. Se piden al desplegar la fila: son pocos
  // productos los que interesan y no vale traerlos todos de entrada.
  const [expanded, setExpanded] = useState<string | null>(null)
  const [gtins, setGtins] = useState<Record<string, ProductGtin[]>>({})
  const [loadingGtins, setLoadingGtins] = useState(false)

  const toggleGtins = (ptId: string) => {
    if (expanded === ptId) { setExpanded(null); return }
    setExpanded(ptId)
    if (gtins[ptId]) return
    setLoadingGtins(true)
    fetch(`/api/product-types/${ptId}/gtins`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ProductGtin[]) => setGtins((prev) => ({ ...prev, [ptId]: data })))
      .catch(() => setGtins((prev) => ({ ...prev, [ptId]: [] })))
      .finally(() => setLoadingGtins(false))
  }

  const handleUnlink = (ptId: string, gtinId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await unlinkProductGtinAction(ptId, gtinId)
      if (result.error) {
        setError(result.error)
        return
      }
      setGtins((prev) => ({
        ...prev,
        [ptId]: (prev[ptId] ?? []).filter((g) => g.id !== gtinId),
      }))
    })
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/product-types").then((r) => r.ok ? r.json() : []),
      fetch("/api/campaigns/mine").then((r) => r.ok ? r.json() : []),
    ])
      .then(([pts, camps]) => {
        setProducts(pts)
        setCampaigns(camps)
      })
      .catch(() => setError(t.error_load))
      .finally(() => setLoading(false))
  }, [])

  const campaignName = (id: string | null) => {
    if (!id) return null
    return campaigns.find((c) => c.id === id)?.name ?? id.slice(0, 8)
  }

  const handlePromote = (pt: ProductTypeWithCampaign) => {
    setError(null)
    startTransition(async () => {
      const result = await promoteProductTypeAction(pt.id)
      if (result.error) {
        setError(result.error)
      } else {
        setProducts((prev) =>
          prev.map((p) => p.id === pt.id ? { ...p, campaign_id: null } : p)
        )
      }
    })
  }

  const filtered = products.filter((p) => {
    if (categoryFilter && p.category !== categoryFilter) return false
    if (scopeFilter === "global" && p.campaign_id !== null) return false
    if (scopeFilter === "campaign" && p.campaign_id === null) return false
    return true
  })

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-tx">{t.title}</h1>
          <p className="text-sm text-mut mt-1">
            {t.subtitle}
          </p>
        </div>
        {isAdmin && (
          <PageAction href="/dashboard/catalog/new" icon={Plus} label={t.new} />
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-inpB px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
        >
          <option value="">{t.filter_all_categories}</option>
          {Object.entries(t.category).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <div className="flex rounded-lg border border-inpB overflow-hidden text-sm">
          {(["all", "global", "campaign"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setScopeFilter(v)}
              className={`px-3 py-1.5 ${scopeFilter === v ? "bg-[var(--blue)] text-white" : "bg-card text-mut hover:bg-card2"}`}
            >
              {v === "all" ? t.filter_all : v === "global" ? t.filter_global : t.filter_campaign}
            </button>
          ))}
        </div>

        <span className="ml-auto self-center text-xs text-fnt">
          {filtered.length === 1 ? t.result_one : t.result_other.replace("{count}", String(filtered.length))}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-dRejB bg-dRejB px-4 py-3 text-sm text-dRejT">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-cardB bg-card p-8 text-center">
          <p className="text-sm text-fnt">{t.loading}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-cardB bg-card p-8 text-center">
          <p className="text-sm text-fnt">{t.empty}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-cardB bg-card overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="border-b border-line bg-card2">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-mut uppercase tracking-wide">{t.col_product}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-mut uppercase tracking-wide">{t.col_category}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-mut uppercase tracking-wide">{t.col_scope}</th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-mut uppercase tracking-wide">{t.col_actions}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((pt) => (
                <Fragment key={pt.id}>
                <tr className="hover:bg-card2">
                  <td className="px-4 py-3">
                    <p className="font-medium text-tx">{pt.display_name}</p>
                    <p className="text-xs text-fnt">
                      {pt.inn_name && `${pt.inn_name} · `}
                      {pt.strength && `${pt.strength} · `}
                      {pt.form}
                      {pt.is_controlled && (
                        <span className="ml-1 rounded bg-dRejB px-1 py-0.5 text-xs font-medium text-dRejT">
                          {t.controlled_badge}
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-mut">
                    {t.category[pt.category as keyof typeof t.category] ?? pt.category}
                  </td>
                  <td className="px-4 py-3">
                    {pt.campaign_id === null ? (
                      <span className="inline-flex items-center rounded-full bg-blueSoft px-2.5 py-0.5 text-xs font-medium text-[var(--blue)]">
                        {t.scope_global}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-dDraftB px-2.5 py-0.5 text-xs font-medium text-dDraftT">
                        {campaignName(pt.campaign_id) ?? t.scope_campaign_fallback}
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleGtins(pt.id)}
                        className="text-xs text-mut hover:text-tx"
                      >
                        {expanded === pt.id ? t.gtins_hide : t.gtins_show}
                      </button>
                      {pt.campaign_id !== null && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handlePromote(pt)}
                          className="ml-3 text-xs text-[var(--blue)] hover:text-[var(--blue)] disabled:opacity-50"
                        >
                          {t.promote_action}
                        </button>
                      )}
                    </td>
                  )}
                </tr>

                {isAdmin && expanded === pt.id && (
                  <tr className="bg-card2">
                    <td colSpan={4} className="px-4 py-3">
                      <p className="mb-2 text-xs font-semibold text-mut">{t.gtins_title}</p>
                      {loadingGtins && !gtins[pt.id] ? (
                        <p className="text-xs text-fnt">{t.loading}</p>
                      ) : (gtins[pt.id] ?? []).length === 0 ? (
                        <p className="text-xs text-fnt">{t.gtins_empty}</p>
                      ) : (
                        <ul className="space-y-1">
                          {(gtins[pt.id] ?? []).map((g) => (
                            <li key={g.id} className="flex items-center gap-3 text-xs">
                              <span className="font-mono text-tx">{g.gtin}</span>
                              <span className="text-fnt">{t.gtins_source[g.source as keyof typeof t.gtins_source] ?? g.source}</span>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleUnlink(pt.id, g.id)}
                                className="ml-auto text-[var(--dRejT)] hover:underline disabled:opacity-50"
                              >
                                {t.gtins_unlink}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
