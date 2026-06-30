"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  listRequestsAction,
  createRequestAction,
  addRequestMessageAction,
  type RequestOut,
} from "@/lib/request-actions"

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

const EMPTY_FORM = { title: "", description: "" }

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })
}

export default function DashboardRequestsPage() {
  const { status } = useSession()
  const [requests, setRequests] = useState<RequestOut[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<RequestOut | null>(null)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)

  async function load() {
    setLoading(true)
    const data = await listRequestsAction()
    setRequests(data)
    setLoading(false)
  }

  useEffect(() => {
    if (status !== "authenticated") return
    load()
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError(null)
    try {
      const created = await createRequestAction({
        title: form.title.trim(),
        description: form.description.trim(),
      })
      setRequests((rs) => [created, ...rs])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la solicitud")
    } finally {
      setSaving(false)
    }
  }

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

  if (status === "loading" || loading) {
    return <div className="text-sm text-zinc-400 py-8 text-center">Cargando...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Mis solicitudes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Comunicación con el equipo nacional</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          {showForm ? "Cancelar" : "+ Nueva solicitud"}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
          <p className="text-sm font-medium text-zinc-700">Nueva solicitud</p>
          <div>
            <label className="text-xs text-zinc-500">Asunto *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Resumen breve del tema"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Detalla tu solicitud, necesidad o pregunta..."
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        </form>
      )}

      <div className={`grid gap-4 ${selected ? "lg:grid-cols-2" : ""}`}>
        <div className="space-y-2">
          {requests.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              No tienes solicitudes. Crea una para comunicarte con el equipo nacional.
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
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selected.status]}`}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                  <button onClick={() => setSelected(null)} className="text-xs text-zinc-400 hover:text-zinc-600">✕</button>
                </div>
              </div>
              <p className="mt-2 text-sm text-zinc-600">{selected.description}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selected.messages.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-4">Sin respuestas aún.</p>
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
                  placeholder="Agregar mensaje..."
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
