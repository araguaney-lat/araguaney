"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"

import { apiFetch } from "@/lib/api"
import { useDict } from "@/context/DictionaryContext"

interface RiskReview {
  id: string
  kind: string
  status: string
  reason: string | null
  boxes: string | null
  created_at: string
  reviewed_at: string | null
  review_note: string | null
}

export default function RiskReviewsPage() {
  const dict = useDict()
  const t = dict.dashboard.reviews
  const tc = dict.dashboard.common
  const { data: session } = useSession()
  const token = session?.accessToken ?? ""

  const [rows, setRows] = useState<RiskReview[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!token) return
    setLoading(true)
    apiFetch<RiskReview[]>("/v1/risk-reviews", { token })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(load, [load]) // eslint-disable-line react-hooks/set-state-in-effect -- carga o suscripción de datos intencional al montar o al cambiar de filtro; migrar a una capa de datos (SWR/react-query) se rastrea aparte

  async function resolve(id: string, resolution: "APPROVED" | "REJECTED") {
    setBusy(id)
    setError(null)
    try {
      await apiFetch(`/v1/risk-reviews/${id}/resolve`, {
        method: "POST",
        token,
        body: JSON.stringify({ resolution, note: notes[id]?.trim() || null }),
      })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc.error_unknown)
    } finally {
      setBusy(null)
    }
  }

  const pending = rows.filter((r) => r.status === "PENDING")
  const resolved = rows.filter((r) => r.status !== "PENDING")

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-tx">{t.title}</h1>
      <p className="mt-1 text-sm text-mut">{t.subtitle}</p>

      {error && <p className="mt-4 text-sm text-[var(--dRejT)]">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-fnt">{tc.loading}</p>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {pending.length === 0 ? (
              <p className="rounded-xl border border-cardB bg-card p-6 text-center text-sm text-fnt">
                {t.empty}
              </p>
            ) : (
              pending.map((r) => (
                <div key={r.id} className="rounded-xl border border-cardB bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-tx">
                        {r.kind === "ANONYMOUS_EXCEPTION" ? t.kind_anonymous : t.kind_volume}
                      </p>
                      <p className="mt-1 text-xs text-mut">
                        {t.boxes.replace("{n}", r.boxes ?? "—")} ·{" "}
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {r.reason && (
                    <p className="mt-3 rounded-lg bg-card2 p-3 text-sm text-fnt">“{r.reason}”</p>
                  )}

                  <textarea
                    className="mt-3 w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx"
                    rows={2}
                    placeholder={t.note_placeholder}
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  />

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => resolve(r.id, "APPROVED")}
                      className="rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-medium text-[#3B2A00] hover:opacity-90 disabled:opacity-50"
                    >
                      {t.approve}
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => resolve(r.id, "REJECTED")}
                      className="rounded-lg border border-inpB px-4 py-2 text-sm text-mut hover:bg-card2 disabled:opacity-50"
                    >
                      {t.reject}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {resolved.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-mut">{t.resolved}</p>
              <ul className="mt-2 space-y-2">
                {resolved.map((r) => (
                  <li key={r.id} className="rounded-lg border border-cardB bg-card px-4 py-3 text-sm">
                    <span className={r.status === "APPROVED" ? "text-dSealT" : "text-[var(--dRejT)]"}>
                      {r.status === "APPROVED" ? t.approved : t.rejected}
                    </span>
                    <span className="text-mut">
                      {" "}· {r.kind === "ANONYMOUS_EXCEPTION" ? t.kind_anonymous : t.kind_volume}
                    </span>
                    {r.review_note && <p className="mt-1 text-xs text-fnt">{r.review_note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
