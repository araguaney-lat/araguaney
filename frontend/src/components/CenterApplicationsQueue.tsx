"use client"

import { useState } from "react"
import {
  approveCenterApplication,
  rejectCenterApplication,
  type CenterApplication,
} from "@/lib/center-application-actions"

export interface QueueLabels {
  count_one: string
  count_other: string
  empty: string
  contact: string
  backing: string
  social: string
  message: string
  created: string
  approve: string
  approving: string
  reject: string
  rejecting: string
  reject_reason_label: string
  reject_reason_placeholder: string
  reject_confirm: string
  cancel: string
  error_unknown: string
}

interface Props {
  initial: CenterApplication[]
  labels: QueueLabels
  locale: string
}

const CARD: React.CSSProperties = {
  border: "1px solid #e4e4e7",
  borderRadius: 14,
  background: "#fff",
  padding: 18,
}

export default function CenterApplicationsQueue({ initial, labels: t, locale }: Props) {
  const [apps, setApps] = useState<CenterApplication[]>(initial)
  const [busy, setBusy] = useState<{ id: string; kind: "approve" | "reject" } | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-MX", {
    dateStyle: "medium",
  })

  function remove(id: string) {
    setApps((list) => list.filter((a) => a.id !== id))
  }

  async function handleApprove(id: string) {
    setBusy({ id, kind: "approve" })
    setError(null)
    try {
      await approveCenterApplication(id)
      remove(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error_unknown)
    } finally {
      setBusy(null)
    }
  }

  async function handleReject(id: string) {
    if (!reason.trim()) return
    setBusy({ id, kind: "reject" })
    setError(null)
    try {
      await rejectCenterApplication(id, reason)
      remove(id)
      setRejectingId(null)
      setReason("")
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error_unknown)
    } finally {
      setBusy(null)
    }
  }

  const count = apps.length === 1 ? t.count_one : t.count_other.replace("{count}", String(apps.length))

  return (
    <div className="space-y-4">
      <p className="text-sm text-mut">{count}</p>

      {error && (
        <p className="rounded-lg border border-dRejB bg-dRejB px-3 py-2 text-xs text-dRejT">{error}</p>
      )}

      {apps.length === 0 ? (
        <div className="rounded-xl border border-cardB bg-card p-8 text-center text-sm text-fnt">
          {t.empty}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {apps.map((a) => {
            const isRejecting = rejectingId === a.id
            const approving = busy?.id === a.id && busy.kind === "approve"
            const rejecting = busy?.id === a.id && busy.kind === "reject"
            const rowBusy = busy?.id === a.id
            return (
              <div key={a.id} style={CARD} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-tx truncate">{a.center_name}</h3>
                    <p className="mt-0.5 text-xs text-mut">
                      {[a.state_name, a.country_code].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-fnt">
                    {t.created}: {dateFmt.format(new Date(a.created_at))}
                  </span>
                </div>

                <dl className="mt-3 space-y-1.5 text-sm">
                  <div>
                    <dt className="inline text-xs font-medium text-fnt">{t.contact}: </dt>
                    <dd className="inline text-mut">
                      {a.contact_name} · {a.contact_email}
                      {a.contact_phone ? ` · ${a.contact_phone}` : ""}
                    </dd>
                  </div>
                  {a.backing_org && (
                    <div>
                      <dt className="inline text-xs font-medium text-fnt">{t.backing}: </dt>
                      <dd className="inline text-mut">{a.backing_org}</dd>
                    </div>
                  )}
                  {a.address && (
                    <div>
                      <dd className="text-mut text-xs">{a.address}</dd>
                    </div>
                  )}
                  {a.social_url && (
                    <div>
                      <dt className="inline text-xs font-medium text-fnt">{t.social}: </dt>
                      <a
                        href={a.social_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-sm text-[var(--blue)] underline break-all"
                      >
                        {a.social_url}
                      </a>
                    </div>
                  )}
                  {a.message && (
                    <div className="mt-1 rounded-lg bg-card2 px-3 py-2 text-xs text-mut">
                      <span className="font-medium text-fnt">{t.message}: </span>
                      {a.message}
                    </div>
                  )}
                </dl>

                <div className="mt-4 pt-3 border-t border-line">
                  {isRejecting ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-mut">{t.reject_reason_label}</label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={t.reject_reason_placeholder}
                        rows={2}
                        maxLength={500}
                        className="w-full rounded-lg border border-cardB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setRejectingId(null)
                            setReason("")
                          }}
                          className="rounded-lg px-3 py-1.5 text-xs text-mut hover:bg-chip"
                        >
                          {t.cancel}
                        </button>
                        <button
                          onClick={() => handleReject(a.id)}
                          disabled={rejecting || !reason.trim()}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {rejecting ? t.rejecting : t.reject_confirm}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setRejectingId(a.id)
                          setReason("")
                          setError(null)
                        }}
                        disabled={rowBusy}
                        className="rounded-lg border border-cardB px-3 py-1.5 text-xs font-medium text-dRejT hover:bg-dRejB disabled:opacity-50"
                      >
                        {t.reject}
                      </button>
                      <button
                        onClick={() => handleApprove(a.id)}
                        disabled={rowBusy}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {approving ? t.approving : t.approve}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
