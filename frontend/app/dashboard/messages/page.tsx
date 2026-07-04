"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import type { ThreadOut, ThreadDetailOut, AttachmentOut, Campaign } from "@/types"
import { createThreadAction, addReplyAction, markReadAction } from "@/lib/message-actions"
import { Paperclip, Send, X, FileText, ImageIcon, Download } from "lucide-react"
import { useDict } from "@/context/DictionaryContext"

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
      className="inline-flex items-center gap-1.5 text-xs text-mut hover:text-tx border border-cardB rounded px-2 py-1 hover:bg-card2"
    >
      <FileIcon contentType={attachment.content_type} />
      <span className="truncate max-w-[160px]">{attachment.filename}</span>
      <Download size={12} />
    </button>
  )
}

export default function MessagesPage() {
  const dict = useDict()
  const t = dict.dashboard.messages

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

  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody] = useState("")
  const [newCampaignId, setNewCampaignId] = useState("")
  const [newType, setNewType] = useState<"PRIVATE" | "PUBLIC">("PRIVATE")
  const [newRecipientIds, setNewRecipientIds] = useState<string[]>([])
  const [campaignMembers, setCampaignMembers] = useState<{ id: string; email: string; full_name?: string | null }[]>([])

  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replyEndRef = useRef<HTMLDivElement>(null)

  const fetchThreads = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/messages?thread_type=${tab}`)
      if (!res.ok) throw new Error(dict.dashboard.common.error_unknown)
      setThreads(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : dict.dashboard.common.error_unknown)
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

  useEffect(() => { fetchThreads() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

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
      if (!ALLOWED_TYPES.includes(f.type)) {
        setError(`${t.file_type_error} ${f.name}`)
        return false
      }
      if (f.size > MAX_SIZE) {
        setError(t.file_size_error.replace("{name}", f.name))
        return false
      }
      return true
    })
    setPendingFiles((prev) => [...prev, ...valid].slice(0, 5))
  }

  return (
    <div className="flex h-full max-h-[calc(100vh-6rem)] gap-4">
      {/* Thread list — full width on mobile when no thread is open, fixed column on md+ */}
      <div className={`w-full md:w-80 flex-shrink-0 flex-col border border-cardB rounded-xl bg-card overflow-hidden ${activeThread ? "hidden md:flex" : "flex"}`}>
        <div className="p-3 border-b border-line">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-semibold text-tx">{t.title}</h1>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs px-2 py-1 bg-[var(--gold)] text-[#3B2A00] rounded-lg hover:opacity-90"
            >
              {t.new_short}
            </button>
          </div>
          <div className="flex gap-1">
            {(["PRIVATE", "PUBLIC"] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={`flex-1 text-xs py-1 rounded-lg font-medium transition-colors ${tab === tabKey ? "bg-[var(--gold)] text-[#3B2A00]" : "text-mut hover:text-tx"}`}
              >
                {tabKey === "PRIVATE" ? t.tab_private : t.tab_campaign}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-line">
          {loading ? (
            <p className="text-xs text-fnt p-4">{dict.dashboard.common.loading}</p>
          ) : threads.length === 0 ? (
            <p className="text-xs text-fnt p-4">{t.empty}</p>
          ) : threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => fetchDetail(thread.id)}
              className={`w-full text-left p-3 hover:bg-card2 transition-colors ${activeThread?.id === thread.id ? "bg-card2" : ""}`}
            >
              <p className="text-xs font-semibold text-tx truncate">{thread.title}</p>
              <p className="text-xs text-fnt mt-0.5">{formatDate(thread.updated_at)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Thread detail — hidden on mobile until a thread is selected, always shown on md+ */}
      <div className={`flex-1 flex-col border border-cardB rounded-xl bg-card overflow-hidden ${activeThread ? "flex" : "hidden md:flex"}`}>
        {!activeThread ? (
          <div className="flex-1 flex items-center justify-center text-sm text-fnt">
            {t.select_thread}
          </div>
        ) : (
          <>
            <div className="border-b border-line p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-tx">{activeThread.title}</p>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${activeThread.thread_type === "PRIVATE" ? "bg-[var(--blueSoft)] text-[var(--blue)]" : "bg-dSealB text-dSealT"}`}>
                  {activeThread.thread_type === "PRIVATE" ? t.type_private : t.type_campaign}
                </span>
              </div>
              <button onClick={() => setActiveThread(null)} className="text-fnt hover:text-tx flex-shrink-0">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-fnt">{formatDate(activeThread.created_at)}</p>
                <div className="bg-card2 rounded-xl p-3 text-sm text-tx whitespace-pre-wrap">
                  {activeThread.body}
                </div>
                {activeThread.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeThread.attachments.map((a) => <AttachmentLink key={a.id} attachment={a} />)}
                  </div>
                )}
              </div>

              {activeThread.replies.map((reply) => {
                const isMe = reply.sender_id === myUserId
                return (
                  <div key={reply.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl p-3 space-y-1 ${isMe ? "bg-[var(--blue)] text-white" : "bg-card2 text-tx"}`}>
                      <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                      {reply.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {reply.attachments.map((a) => <AttachmentLink key={a.id} attachment={a} />)}
                        </div>
                      )}
                      <p className={`text-xs mt-1 ${isMe ? "text-white/70" : "text-mut"}`}>
                        {formatDate(reply.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={replyEndRef} />
            </div>

            <div className="border-t border-line p-3 space-y-2">
              {error && (
                <p className="text-xs text-[var(--dRejT)]">{error} <button className="underline ml-1" onClick={() => setError(null)}>✕</button></p>
              )}
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {pendingFiles.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs border border-cardB rounded px-2 py-0.5 text-mut">
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
                  placeholder={t.reply_placeholder_detail}
                  rows={2}
                  className="flex-1 text-sm border border-inpB bg-inp text-tx rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
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
                    className="p-2 text-mut hover:text-tx border border-cardB rounded-lg"
                    title={t.attach_file}
                  >
                    <Paperclip size={16} />
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={!replyBody.trim() || actionLoading}
                    className="p-2 bg-[var(--gold)] text-[#3B2A00] rounded-lg hover:opacity-90 disabled:opacity-50"
                    title={t.send}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl w-full max-w-lg shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-tx">{t.new_modal_title}</h2>
              <button onClick={() => setShowCreate(false)} className="text-fnt hover:text-tx"><X size={18} /></button>
            </div>

            {error && <p className="text-xs text-[var(--dRejT)]">{error}</p>}

            <div className="flex gap-2">
              {(["PRIVATE", "PUBLIC"] as const).map((typeKey) => (
                <button
                  key={typeKey}
                  onClick={() => setNewType(typeKey)}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium border transition-colors ${newType === typeKey ? "bg-[var(--gold)] text-[#3B2A00] border-[var(--gold)]" : "border-cardB text-mut hover:border-sec"}`}
                >
                  {typeKey === "PRIVATE" ? t.type_private : t.type_campaign}
                </button>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-xs text-mut">{t.field_campaign}</span>
              <select
                className="w-full text-sm border border-inpB bg-inp text-tx rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                value={newCampaignId}
                onChange={(e) => { setNewCampaignId(e.target.value); setNewRecipientIds([]) }}
              >
                <option value="">— {t.field_campaign} —</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            {newType === "PRIVATE" && newCampaignId && (
              <label className="block space-y-1">
                <span className="text-xs text-mut">{t.field_recipients}</span>
                <div className="max-h-32 overflow-y-auto border border-cardB rounded-lg p-2 space-y-1">
                  {campaignMembers
                    .filter((m) => m.id !== myUserId)
                    .map((m) => {
                      const selected = newRecipientIds.includes(m.id)
                      return (
                        <label key={m.id} className={`flex items-center gap-2 text-xs p-1 rounded cursor-pointer ${selected ? "bg-card2" : "hover:bg-card2"}`}>
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
                    <p className="text-fnt text-xs p-1">{t.no_members}</p>
                  )}
                </div>
              </label>
            )}

            <label className="block space-y-1">
              <span className="text-xs text-mut">{t.field_subject}</span>
              <input
                className="w-full text-sm border border-inpB bg-inp text-tx rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t.subject_placeholder}
                maxLength={200}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-mut">{t.field_body}</span>
              <textarea
                className="w-full text-sm border border-inpB bg-inp text-tx rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                rows={4}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder={t.body_placeholder}
              />
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newBody.trim() || !newCampaignId || actionLoading || (newType === "PRIVATE" && newRecipientIds.length === 0)}
                className="px-4 py-2 bg-[var(--gold)] text-[#3B2A00] rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? t.sending : t.send}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-mut hover:text-tx">
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
