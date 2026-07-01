"use client"

import { useEffect, useState } from "react"

interface CampaignWeight {
  campaign_id: string
  campaign_name: string
  total_kg: number
  goal_kg: number | null
  progress_pct: number | null
}

interface WeightData {
  campaigns: CampaignWeight[]
  center_kg: number | null
}

function fmt(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`
  return `${kg.toFixed(1)} kg`
}

export function WeightCards() {
  const [data, setData] = useState<WeightData | null>(null)

  useEffect(() => {
    fetch("/api/dashboard/weight")
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => null)
  }, [])

  if (!data) return null
  if (data.campaigns.length === 0 && data.center_kg === null) return null

  const campaignsWithWeight = data.campaigns.filter((c) => c.total_kg > 0 || c.goal_kg !== null)

  return (
    <div className="mt-8 space-y-4">
      {/* Center total */}
      {data.center_kg !== null && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-xs text-zinc-500 mb-1">Tu centro ha acopiado</p>
          <p className="text-2xl font-bold text-zinc-900">{fmt(data.center_kg)}</p>
        </div>
      )}

      {/* Campaign weight cards */}
      {campaignsWithWeight.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Por campaña
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {campaignsWithWeight.map((c) => (
              <div key={c.campaign_id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium text-zinc-800 leading-snug line-clamp-1 mb-2">
                  {c.campaign_name}
                </p>
                <p className="text-xl font-bold text-zinc-900">{fmt(c.total_kg)}</p>
                {c.goal_kg !== null && (
                  <>
                    <div className="mt-2 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-900 transition-all"
                        style={{ width: `${Math.min(c.progress_pct ?? 0, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      {c.progress_pct?.toFixed(1)}% de {fmt(c.goal_kg)}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
