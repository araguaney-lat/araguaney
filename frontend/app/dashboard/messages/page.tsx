"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import type { ThreadOut, ThreadDetailOut, AttachmentOut, Campaign } from "@/types"
import { createThreadAction, addReplyAction, markReadAction } from "@/lib/message-actions"
import { Paperclip, Send, X, FileText, ImageIcon, Download } from "lucide-react"

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]
const MAX_SIZE = 10 * 1024 * 1024

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })
}

function FileIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith("image/")) return <ImageIcon size={14} />
  return <FileText size={14} />
}

function AttachmentLink({ attachment }: { attachment: AttachmentOut }) {
  const download = async () => {
    const res = await fetch(`/api/messages/attachments/${attachment.id}/url`)
    if (res.ok) {
      const { url } = await res.json()
      window.open(url, "_blank")
    }
  }
  return (
    <button
      onClick={download}
      className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded px-2 py-1 hover:bg-zinc-50"
    >
      <FileIcon contentType={attachment.content_type} />
      <span className="truncate max-w-[160px]">{attachment.filename}</span>
      <Download size={12} />
    </button>
  )
}

export default function MessagesPage() {
  const { data: session } = useSession()
  const myUserId = session?.user?.id ?? null

  const [tab, setTab] = useState<"PRIVATE" | "PUBLIC">("PRIVATE")
  const [threads, setThreads] = useState<ThreadOut[]>([])
  const [activeThread, setActiveThread] = useState<ThreadDetailOut | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const [showCreate, setShowCreate] = useState(false)

  // New thread form
  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody] = useState("")
  const [newCampaignId, setNewCampaignId] = useState("")
  const [newType, setNewType] = useState<"PRIVATE" | "PUBLIC">("PRIVATE")
  const [newRecipientIds, setNewRecipientIds] = useState<string[]>([])
  const [campaignMembers, setCampaignMembers] = useState<{ id: string; email: string; full_name?: string | null }[]>([])

  // Attachment state for reply
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replyEndRef = useRef<HTMLDivElement>(null)

  const fetchThreads = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/messages?thread_type=${tab}`)
      if (!res.ok) throw new Error("Error al cargar mensajes")
      setThreads(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const fetchDetail = async (id: string) => {
    const res = await fetch(`/api/messages/${id}`)
    if (res.ok) {
      const detail: ThreadDetailOut = await res.json()
      setActiveThread(detail)
      if (detail.thread_type === "PRIVATE") {
        markReadAction(id).catch(() => null)
      }
    }
  }

  useEffect(() => { fetchThreads() }, [tab])

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.ok ? r.json() : [])
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
  }, [])

  useEffect(() => {
    if (!newCampaignId) { setCampaignMembers([]); return }
    fetch(`/api/campaigns/${newCampaignId}/members`)
      .then((r) => r.ok ? r.json() : [])
      .then(setCampaignMembers)
      .catch(() => setCampaignMembers([]))
  }, [newCampaignId])

  useEffect(() => {
    replyEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeThread?.replies])

  const handleCreate = async () => {
    if (!newTitle.trim() || !newBody.trim() || !newCampaignId) return
    setActionLoading(true)
    const result = await createThreadAction({
      title: newTitle.trim(),
      body: newBody.trim(),
      thread_type: newType,
      campaign_id: newCampaignId,
      recipient_ids: newType === "PRIVATE" ? newRecipientIds : [],
    })
    setActionLoading(false)
    if (result.error) setError(result.error)
    else {
      setShowCreate(false)
      setNewTitle(""); setNewBody(""); setNewCampaignId(""); setNewRecipientIds([])
      await fetchThreads()
    }
  }

  const handleReply = async () => {
    if (!activeThread || !replyBody.trim()) return
    setActionLoading(true)
    const result = await addReplyAction(activeThread.id, replyBody.trim())
    setActionLoading(false)
    if (result.error) setError(result.error)
    else {
      setReplyBody("")
      setPendingFiles([])
      await fetchDetail(activeThread.id)
      await fetchThreads()
    }
  }

  const handleFileAdd = (files: FileList | null) => {
    if (!files) return
    const valid = Array.from(files).filter((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) { setError(`Tipo no permitido: ${f.name}`); return false }
      if (f.size > MAX_SIZE) { setError(`Archivo muy grande: ${f.name} (máx 10 MB)`); return false }
      return true
    })
    setPendingFiles((prev) => [...prev, ...valid].slice(0, 5))
  }

  const unreadCount = threads.filter((t) => {
    // Simple heuristic: for PRIVATE threads, flag as unread if updated recently
    // Real unread tracking would require participant.last_read_at from backend
    return t.thread_type === "PRIVATE"
  }).length

  return (
    <div className="flex h-full max-h-[calc(100vh-6rem)] gap-4">
      {/* Thread list */}
      <div className="w-80 flex-shrink-0 flex flex-col border border-zinc-200 rounded-xl bg-white overflow-hidden">
        <div className="p-3 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-semibold text-zinc-900">Mensajes</h1>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs px-2 py-1 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700"
            >
              + Nuevo
            </button>
          </div>
          <div className="flex gap-1">
            {(["PRIVATE", "PUBLIC"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-xs py-1 rounded-lg font-medium transition-colors ${tab === t ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-800"}`}
              >
                {t === "PRIVATE" ? "Privados" : "Campaña"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
          {loading ? (
            <p className="text-xs text-zinc-400 p-4">Cargando…</p>
          ) : threads.length === 0 ? (
            <p className="text-xs text-zinc-400 p-4">No hay mensajes.</p>
          ) : threads.map((t) => (
            <button
              key={t.id}
              onClick={() => fetchDetail(t.id)}
              className={`w-full text-left p-3 hover:bg-zinc-50 transition-colors ${activeThread?.id === t.id ? "bg-zinc-50" : ""}`}
            >
              <p className="text-xs font-semibold text-zinc-900 truncate">{t.title}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{formatDate(t.updated_at)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Thread detail */}
      <div className="flex-1 flex flex-col border border-zinc-200 rounded-xl bg-white overflow-hidden">
        {!activeThread ? (
          <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">
            Selecciona un mensaje para leerlo
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-zinc-100 p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{activeThread.title}</p>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${activeThread.thread_type === "PRIVATE" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>
                  {activeThread.thread_type === "PRIVATE" ? "Privado" : "Campaña"}
                </span>
              </div>
              <button onClick={() => setActiveThread(null)} className="text-zinc-400 hover:text-zinc-700 flex-shrink-0">✕</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Original message */}
              <div className="space-y-1">
                <p className="text-xs text-zinc-400">{formatDate(activeThread.created_at)}</p>
                <div className="bg-zinc-50 rounded-xl p-3 text-sm text-zinc-800 whitespace-pre-wrap">
                  {activeThread.body}
                </div>
                {activeThread.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeThread.attachments.map((a) => <AttachmentLink key={a.id} attachment={a} />)}
                  </div>
                )}
              </div>

              {/* Replies */}
              {activeThread.replies.map((reply) => {
                const isMe = reply.sender_id === myUserId
                return (
                  <div key={reply.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl p-3 space-y-1 ${isMe ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"}`}>
                      <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                      {reply.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {reply.attachments.map((a) => <AttachmentLink key={a.id} attachment={a} />)}
                        </div>
                      )}
                      <p className={`text-xs mt-1 ${isMe ? "text-zinc-400" : "text-zinc-500"}`}>
                        {formatDate(reply.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={replyEndRef} />
            </div>

            {/* Reply box */}
            <div className="border-t border-zinc-100 p-3 space-y-2">
              {error && (
                <p className="text-xs text-red-600">{error} <button className="underline ml-1" onClick={() => setError(null)}>✕</button></p>
              )}
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {pendingFiles.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs border border-zinc-200 rounded px-2 py-0.5 text-zinc-600">
                      {f.name}
                      <button onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply() }}
                  placeholder="Escribe una respuesta… (⌘↵ para enviar)"
                  rows={2}
                  className="flex-1 text-sm border border-zinc-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
                <div className="flex flex-col gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ALLOWED_TYPES.join(",")}
                    className="hidden"
                    onChange={(e) => handleFileAdd(e.target.files)}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg"
                    title="Adjuntar archivo"
                  >
                    <Paperclip size={16} />
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={!replyBody.trim() || actionLoading}
                    className="p-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50"
                    title="Enviar"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create thread modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Nuevo mensaje</h2>
              <button onClick={() => setShowCreate(false)} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2">
              {(["PRIVATE", "PUBLIC"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium border transition-colors ${newType === t ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-300 text-zinc-600 hover:border-zinc-500"}`}
                >
                  {t === "PRIVATE" ? "Privado" : "Campaña"}
                </button>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Campaña</span>
              <select
                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={newCampaignId}
                onChange={(e) => { setNewCampaignId(e.target.value); setNewRecipientIds([]) }}
              >
                <option value="">— Seleccionar —</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            {newType === "PRIVATE" && newCampaignId && (
              <label className="block space-y-1">
                <span className="text-xs text-zinc-500">Destinatarios</span>
                <div className="max-h-32 overflow-y-auto border border-zinc-200 rounded-lg p-2 space-y-1">
                  {campaignMembers
                    .filter((m) => m.id !== myUserId)
                    .map((m) => {
                      const selected = newRecipientIds.includes(m.id)
                      return (
                        <label key={m.id} className={`flex items-center gap-2 text-xs p-1 rounded cursor-pointer ${selected ? "bg-zinc-100" : "hover:bg-zinc-50"}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => setNewRecipientIds((prev) =>
                              e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                            )}
                            className="rounded"
                          />
                          <span>{m.full_name ?? m.email}</span>
                        </label>
                      )
                    })}
                  {campaignMembers.filter((m) => m.id !== myUserId).length === 0 && (
                    <p className="text-zinc-400 text-xs p-1">No hay otros miembros en esta campaña.</p>
                  )}
                </div>
              </label>
            )}

            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Asunto</span>
              <input
                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Asunto del mensaje"
                maxLength={200}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Mensaje</span>
              <textarea
                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400"
                rows={4}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Escribe tu mensaje…"
              />
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newBody.trim() || !newCampaignId || actionLoading || (newType === "PRIVATE" && newRecipientIds.length === 0)}
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50"
              >
                {actionLoading ? "Enviando…" : "Enviar"}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
