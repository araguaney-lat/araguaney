"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import type { ProductType, Campaign } from "@/types"
import { promoteProductTypeAction } from "@/lib/catalog-actions"
import { useDict } from "@/context/DictionaryContext"

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
          <Link
            href="/dashboard/catalog/new"
            className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t.new}
          </Link>
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
        <div className="rounded-xl border border-cardB bg-card overflow-hidden">
          <table className="w-full text-sm">
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
                <tr key={pt.id} className="hover:bg-card2">
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
                    <td className="px-4 py-3 text-right">
                      {pt.campaign_id !== null && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handlePromote(pt)}
                          className="text-xs text-[var(--blue)] hover:text-[var(--blue)] disabled:opacity-50"
                        >
                          {t.promote_action}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
