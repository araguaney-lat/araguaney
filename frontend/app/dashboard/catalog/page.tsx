"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import type { ProductType, Campaign } from "@/types"
import { promoteProductTypeAction } from "@/lib/catalog-actions"

const CATEGORY_LABELS: Record<string, string> = {
  MEDICINE: "Medicamento",
  MEDICAL_SUPPLY: "Insumo médico",
  FOOD: "Alimento",
  WATER: "Agua",
  HYGIENE: "Higiene",
  TOOL: "Herramienta",
  RESCUE_GEAR: "Equipo de rescate",
  OTHER: "Otro",
}

type ProductTypeWithCampaign = ProductType & { campaign_id: string | null }

export default function CatalogPage() {
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
      .catch(() => setError("Error al cargar el catálogo"))
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
          <h1 className="text-xl font-semibold text-zinc-900">Catálogo de productos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Tipos de producto — globales y de campaña.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/catalog/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + Nuevo tipo
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <div className="flex rounded-lg border border-zinc-300 overflow-hidden text-sm">
          {(["all", "global", "campaign"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setScopeFilter(v)}
              className={`px-3 py-1.5 ${scopeFilter === v ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
            >
              {v === "all" ? "Todos" : v === "global" ? "Globales" : "De campaña"}
            </button>
          ))}
        </div>

        <span className="ml-auto self-center text-xs text-zinc-400">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-400">Cargando catálogo…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-400">Sin resultados para los filtros aplicados.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Alcance</th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((pt) => (
                <tr key={pt.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{pt.display_name}</p>
                    <p className="text-xs text-zinc-400">
                      {pt.inn_name && `${pt.inn_name} · `}
                      {pt.strength && `${pt.strength} · `}
                      {pt.form}
                      {pt.is_controlled && (
                        <span className="ml-1 rounded bg-red-100 px-1 py-0.5 text-xs font-medium text-red-700">
                          Controlado
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {CATEGORY_LABELS[pt.category] ?? pt.category}
                  </td>
                  <td className="px-4 py-3">
                    {pt.campaign_id === null ? (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        Global
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        {campaignName(pt.campaign_id) ?? "Campaña"}
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
                          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          Promover al catálogo global
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
