"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  listRequestsAction,
  createRequestAction,
  addRequestMessageAction,
  type RequestOut,
} from "@/lib/request-actions"
import { useDict } from "@/context/DictionaryContext"

import { PageAction } from "@/components/PageAction"

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-dDraftB text-dDraftT",
  IN_PROGRESS: "bg-blueSoft text-[var(--blue)]",
  RESOLVED: "bg-dSealB text-dSealT",
  CLOSED: "bg-chip text-mut",
}

const EMPTY_FORM = { title: "", description: "" }

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })
}

export default function DashboardRequestsPage() {
  const dict = useDict()
  const t = dict.dashboard.requests

  const { status } = useSession()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selected, setSelected] = useState<RequestOut | null>(null)
  const [reply, setReply] = useState("")

  const requestsQuery = useQuery({
    queryKey: ["requests"],
    queryFn: () => listRequestsAction(),
    enabled: status === "authenticated",
  })
  const requests = requestsQuery.data ?? []
  const loading = requestsQuery.isPending

  const createMutation = useMutation({
    mutationFn: () =>
      createRequestAction({ title: form.title.trim(), description: form.description.trim() }),
    onSuccess: () => {
      setForm(EMPTY_FORM)
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ["requests"] })
    },
  })
  const saving = createMutation.isPending
  const error = createMutation.error instanceof Error ? createMutation.error.message : null

  const replyMutation = useMutation({
    mutationFn: (body: string) => addRequestMessageAction(selected!.id, body),
    onSuccess: (msg) => {
      setReply("")
      // El detalle abierto es una copia local; se le agrega el mensaje al vuelo
      // mientras la lista se revalida del servidor.
      setSelected((s) => (s ? { ...s, messages: [...s.messages, msg] } : s))
      qc.invalidateQueries({ queryKey: ["requests"] })
    },
  })
  const sending = replyMutation.isPending

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    createMutation.mutate()
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !reply.trim()) return
    replyMutation.mutate(reply.trim())
  }

  if (status === "loading" || loading) {
    return <div className="text-sm text-fnt py-8 text-center">{dict.dashboard.common.loading}</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-tx">{t.title}</h1>
          <p className="text-sm text-mut mt-0.5">{t.subtitle}</p>
        </div>
        <PageAction
          onClick={() => setShowForm((v) => !v)}
          icon={showForm ? "x" : "plus"}
          label={showForm ? t.cancel : t.new}
        />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-dRejB border border-dRejB px-3 py-2 text-xs text-dRejT">{error}</p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-cardB bg-card p-5 space-y-3">
          <p className="text-sm font-medium text-mut">{t.form_title}</p>
          <div>
            <label className="text-xs text-mut">{t.field_subject}</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={t.subject_placeholder}
              className="mt-1 w-full rounded-lg border border-cardB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            />
          </div>
          <div>
            <label className="text-xs text-mut">{t.field_description}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder={t.description_placeholder}
              className="mt-1 w-full rounded-lg border border-cardB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)] resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? t.submitting : t.submit}
            </button>
          </div>
        </form>
      )}

      <div className={`grid gap-4 ${selected ? "lg:grid-cols-2" : ""}`}>
        <div className="space-y-2">
          {requests.length === 0 ? (
            <div className="rounded-xl border border-cardB bg-card p-8 text-center text-sm text-mut">
              {t.empty}
            </div>
          ) : (
            requests.map((req) => (
              <button
                key={req.id}
                onClick={() => setSelected(req)}
                className={`w-full text-left rounded-xl border bg-card p-4 transition-all ${
                  selected?.id === req.id
                    ? "border-inpB shadow-sm"
                    : "border-cardB hover:border-goldB hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-tx leading-snug">{req.title}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                    {t.status[req.status as keyof typeof t.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-mut line-clamp-2">{req.description}</p>
                <p className="mt-2 text-xs text-fnt">
                  {fmt(req.created_at)} · {req.messages.length === 1
                    ? t.messages_count_one
                    : t.messages_count_other.replace("{count}", String(req.messages.length))}
                </p>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="rounded-xl border border-cardB bg-card overflow-hidden flex flex-col max-h-[calc(100vh-12rem)]">
            <div className="border-b border-line p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-tx">{selected.title}</p>
                  <p className="text-xs text-mut mt-0.5">{fmt(selected.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selected.status]}`}>
                    {t.status[selected.status as keyof typeof t.status]}
                  </span>
                  <button onClick={() => setSelected(null)} className="text-xs text-fnt hover:text-mut">✕</button>
                </div>
              </div>
              <p className="mt-2 text-sm text-mut">{selected.description}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selected.messages.length === 0 && (
                <p className="text-xs text-fnt text-center py-4">{t.no_replies}</p>
              )}
              {selected.messages.map((m) => (
                <div key={m.id} className="rounded-lg bg-card2 border border-line px-3 py-2">
                  <p className="text-sm text-tx">{m.body}</p>
                  <p className="mt-1 text-xs text-fnt">{fmt(m.created_at)}</p>
                </div>
              ))}
            </div>

            {selected.status !== "CLOSED" && (
              <form onSubmit={handleReply} className="border-t border-line p-3 flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t.reply_placeholder}
                  className="flex-1 rounded-lg border border-cardB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="rounded-lg bg-[var(--blue)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? "..." : t.send}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
