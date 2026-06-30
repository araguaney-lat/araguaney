"use client"

import { useEffect, useState } from "react"
import { listRequestsAction, addRequestMessageAction, updateRequestStatusAction } from "@/lib/request-actions"
import type { RequestOut } from "@/lib/request-actions"

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Abierta",
  IN_PROGRESS: "En progreso",
  RESOLVED: "Resuelta",
  CLOSED: "Cerrada",
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-zinc-100 text-zinc-500",
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })
}

export default function StudioRequestsPage() {
  const [requests, setRequests] = useState<RequestOut[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("")
  const [selected, setSelected] = useState<RequestOut | null>(null)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)

  async function load() {
    setLoading(true)
    const data = await listRequestsAction(filterStatus ? { status: filterStatus } : undefined)
    setRequests(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filterStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !reply.trim()) return
    setSending(true)
    try {
      const msg = await addRequestMessageAction(selected.id, reply.trim())
      setReply("")
      const updated = { ...selected, messages: [...selected.messages, msg] }
      setSelected(updated)
      setRequests((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))
    } finally {
      setSending(false)
    }
  }

  async function handleStatus(requestId: string, status: string) {
    const updated = await updateRequestStatusAction(requestId, status)
    setRequests((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))
    if (selected?.id === requestId) setSelected(updated)
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Solicitudes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Bandeja de solicitudes de los equipos</p>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setSelected(null) }}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <div className={`grid gap-4 ${selected ? "lg:grid-cols-2" : ""}`}>
        <div className="space-y-2">
          {loading ? (
            <div className="text-sm text-zinc-400 py-8 text-center">Cargando...</div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              Sin solicitudes.
            </div>
          ) : (
            requests.map((req) => (
              <button
                key={req.id}
                onClick={() => setSelected(req)}
                className={`w-full text-left rounded-xl border bg-white p-4 transition-all ${
                  selected?.id === req.id
                    ? "border-zinc-400 shadow-sm"
                    : "border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-zinc-900 leading-snug">{req.title}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{req.description}</p>
                <p className="mt-2 text-xs text-zinc-400">
                  {fmt(req.created_at)} · {req.messages.length} mensaje{req.messages.length !== 1 ? "s" : ""}
                </p>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden flex flex-col max-h-[calc(100vh-12rem)]">
            <div className="border-b border-zinc-100 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-900">{selected.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{fmt(selected.created_at)}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-xs text-zinc-400 hover:text-zinc-600">✕</button>
              </div>
              <p className="mt-2 text-sm text-zinc-600">{selected.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    disabled={selected.status === s}
                    onClick={() => handleStatus(selected.id, s)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      selected.status === s
                        ? STATUS_COLORS[s] + " opacity-100"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selected.messages.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-4">Sin mensajes.</p>
              )}
              {selected.messages.map((m) => (
                <div key={m.id} className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
                  <p className="text-sm text-zinc-800">{m.body}</p>
                  <p className="mt-1 text-xs text-zinc-400">{fmt(m.created_at)}</p>
                </div>
              ))}
            </div>

            {selected.status !== "CLOSED" && (
              <form onSubmit={handleReply} className="border-t border-zinc-100 p-3 flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Responder..."
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  {sending ? "..." : "Enviar"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
