"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { resendEmail, type EmailFailure } from "@/lib/email-failure-actions"

export interface EmailsLabels {
  empty: string
  col_date: string
  col_type: string
  col_recipient: string
  col_event: string
  col_reason: string
  col_action: string
  event_bounced: string
  event_complained: string
  event_delivery_delayed: string
  resend: string
  resending: string
  resolved: string
  resend_ok: string
  resend_error: string
}

const RESENDABLE = new Set(["invitation", "center_application_confirm"])

const EVENT_COLORS: Record<string, string> = {
  bounced: "bg-red-100 text-red-800",
  complained: "bg-purple-100 text-purple-800",
  delivery_delayed: "bg-yellow-100 text-yellow-800",
}

interface Props {
  initial: EmailFailure[]
  labels: EmailsLabels
}

export function EmailFailuresTable({ initial, labels: t }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null)

  function eventLabel(ev: string): string {
    if (ev === "bounced") return t.event_bounced
    if (ev === "complained") return t.event_complained
    if (ev === "delivery_delayed") return t.event_delivery_delayed
    return ev
  }

  function onResend(id: string) {
    setPendingId(id)
    setFlash(null)
    startTransition(async () => {
      const res = await resendEmail(id)
      setPendingId(null)
      setFlash({ id, ok: res.ok })
      if (res.ok) router.refresh()
    })
  }

  if (initial.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400">
        {t.empty}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t.col_date}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t.col_type}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t.col_recipient}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t.col_event}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t.col_reason}</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">{t.col_action}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {initial.map((f) => {
            const resendable = RESENDABLE.has(f.email_type) && !f.resolved_at
            return (
              <tr key={f.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                  {new Date(f.created_at).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-700">{f.email_type}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">{f.to_email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EVENT_COLORS[f.event_type] ?? "bg-zinc-100 text-zinc-700"}`}>
                    {eventLabel(f.event_type)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500 max-w-[220px] truncate" title={f.reason ?? ""}>{f.reason ?? "—"}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {f.resolved_at ? (
                    <span className="text-xs font-medium text-green-700">{t.resolved}</span>
                  ) : resendable ? (
                    <button
                      onClick={() => onResend(f.id)}
                      disabled={isPending && pendingId === f.id}
                      className="text-xs font-medium px-3 py-1 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      {isPending && pendingId === f.id ? t.resending : t.resend}
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                  {flash && flash.id === f.id && (
                    <span className={`ml-2 text-xs ${flash.ok ? "text-green-700" : "text-red-700"}`}>
                      {flash.ok ? t.resend_ok : t.resend_error}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
