"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { apiFetch } from "@/lib/api"
import type { Center, UserOut } from "@/types"
import { useDict } from "@/context/DictionaryContext"

const ROLES = ["volunteer", "coordinator"]
const EMPTY_FORM = { email: "", username: "", full_name: "", center_role: "volunteer" }

function Avatar({ name, avatarUrl, size }: { name: string; avatarUrl: string | null; size: number }) {
  return (
    <span
      className="flex flex-none items-center justify-center overflow-hidden rounded-full bg-amber-200 font-semibold text-amber-900"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        name[0]?.toUpperCase() ?? "?"
      )}
    </span>
  )
}

function TeamCard({ user }: { user: UserOut }) {
  const name = user.full_name ?? user.username
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-center">
      <Avatar name={name} avatarUrl={user.avatar_url} size={56} />
      <p className="text-sm font-medium text-zinc-900 leading-snug">{name}</p>
    </div>
  )
}

export default function TeamPage() {
  const dict = useDict()
  const t = dict.dashboard.team

  const { data: session } = useSession()
  const token = session?.accessToken ?? ""
  const isNationalAdmin = session?.centerRole === "national_admin"
  const canManage = session?.centerRole === "coordinator" || isNationalAdmin

  // national_admin picks a center from a selector (server-filtered to their
  // own country_code, see GET /v1/centers); coordinator/volunteer only ever
  // have their own single center — no selector needed.
  const [centers, setCenters] = useState<Center[]>([])
  const [selectedCenterId, setSelectedCenterId] = useState<string>("")
  const activeCenterId = isNationalAdmin ? selectedCenterId : session?.centerId

  const [users, setUsers] = useState<UserOut[]>([])
  const [loading, setLoading] = useState(true)
  const [showManage, setShowManage] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reinviting, setReinviting] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // national_admin: load the center list once, auto-select the first one.
  useEffect(() => {
    if (!isNationalAdmin || !token) return
    apiFetch<Center[]>("/v1/centers", { token })
      .then((data) => {
        setCenters(data)
        if (data.length > 0) setSelectedCenterId((id) => id || data[0].id)
      })
      .catch(() => setCenters([]))
  }, [isNationalAdmin, token])

  async function load() {
    if (!activeCenterId || !token) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch<UserOut[]>(`/v1/centers/${activeCenterId}/users`, { token })
      setUsers(data)
    } catch {
      setError(dict.dashboard.common.error_unknown)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [activeCenterId, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const field = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!activeCenterId) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const user = await apiFetch<UserOut>(`/v1/centers/${activeCenterId}/users`, {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          username: form.username.trim(),
          full_name: form.full_name.trim() || undefined,
          center_role: form.center_role,
        }),
        token,
      })
      setUsers((u) => [user, ...u])
      setForm(EMPTY_FORM)
      setShowForm(false)
      setSuccess(t.invite_success)
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.dashboard.common.error_unknown)
    } finally {
      setSaving(false)
    }
  }

  async function handleReinvite(userId: string) {
    if (!activeCenterId) return
    setReinviting(userId)
    setError(null)
    setSuccess(null)
    try {
      await apiFetch(`/v1/centers/${activeCenterId}/users/${userId}/reinvite`, {
        method: "POST",
        token,
      })
      setSuccess(t.reinvite_success)
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.dashboard.common.error_unknown)
    } finally {
      setReinviting(null)
    }
  }

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      coordinator: "bg-amber-100 text-amber-700",
      volunteer: "bg-zinc-100 text-zinc-600",
    }
    return colors[role] ?? "bg-zinc-100 text-zinc-600"
  }

  const coordinators = users.filter((u) => u.center_role === "coordinator")
  const volunteers = users.filter((u) => u.center_role === "volunteer")

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{t.title}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {users.length === 1 ? t.members_count_one : t.members_count_other.replace("{count}", String(users.length))}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { setShowManage((v) => !v); setShowForm(false); setError(null); setSuccess(null) }}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            {showManage ? t.cancel : t.manage_team}
          </button>
        )}
      </div>

      {isNationalAdmin && (
        <div className="mb-6 max-w-xs">
          <label className="text-xs text-zinc-500">{t.select_center_label}</label>
          {centers.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-400">{t.no_centers}</p>
          ) : (
            <select
              value={selectedCenterId}
              onChange={(e) => setSelectedCenterId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              {centers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-zinc-400 py-8 text-center">{dict.dashboard.common.loading}</div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">{t.coordinators_heading}</h2>
            {coordinators.length === 0 ? (
              <p className="text-sm text-zinc-400">{t.no_coordinators}</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {coordinators.map((u) => (
                  <div key={u.id} className="w-32">
                    <TeamCard user={u} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">{t.volunteers_heading}</h2>
            {volunteers.length === 0 ? (
              <p className="text-sm text-zinc-400">{t.no_volunteers}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {volunteers.map((u) => (
                  <TeamCard key={u.id} user={u} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {canManage && showManage && (
        <div className="mt-10 pt-8 border-t border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-zinc-900">{t.manage_team}</h2>
            <button
              onClick={() => { setShowForm((v) => !v); setError(null); setSuccess(null) }}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              {showForm ? t.cancel : t.invite_btn}
            </button>
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
          {success && (
            <p className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">{success}</p>
          )}

          {showForm && (
            <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
              <p className="text-sm font-medium text-zinc-700">{t.form_title}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-zinc-500">{t.field_email}</label>
                  <input required type="email" value={form.email} onChange={field("email")} placeholder="usuario@centro.org"
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">{t.field_username}</label>
                  <input required value={form.username} onChange={field("username")} placeholder="usuario123"
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">{t.field_full_name}</label>
                  <input value={form.full_name} onChange={field("full_name")}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">{t.field_role}</label>
                  <select value={form.center_role} onChange={field("center_role")}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400">
                    {ROLES.map((r) => <option key={r} value={r}>{t.roles[r as keyof typeof t.roles]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
                  {saving ? t.inviting : t.invite_action}
                </button>
              </div>
            </form>
          )}

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{t.col_member}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{t.col_role}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 hidden sm:table-cell">{t.col_status}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{u.full_name ?? u.username}</p>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge(u.center_role ?? "")}`}>
                        {u.center_role ? t.roles[u.center_role as keyof typeof t.roles] ?? u.center_role : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.is_active ? t.status_active : t.status_inactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleReinvite(u.id)}
                        disabled={reinviting === u.id || !u.is_active}
                        className="rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 disabled:opacity-40"
                      >
                        {reinviting === u.id ? "..." : t.reinvite}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400 text-sm">{t.empty}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
