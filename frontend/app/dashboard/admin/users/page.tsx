"use client"

import { useEffect, useState } from "react"
import { listStudioUsersAction, createStudioUserAction, patchStudioUserAction, reinviteStudioUserAction } from "@/lib/studio-actions"
import type { UserOut } from "@/types"
import { useDict } from "@/context/DictionaryContext"
import { COUNTRIES, flagEmoji } from "@/lib/countries"

const ROLES = ["volunteer", "coordinator", "national_admin"]
const EMPTY_FORM = { email: "", username: "", full_name: "", center_role: "volunteer", center_id: "", country_code: "", password: "" }

export default function StudioUsersPage() {
  const dict = useDict()
  const t = dict.dashboard.admin_users

  const [users, setUsers] = useState<UserOut[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ center_role: string; is_active: boolean; country_code: string }>({ center_role: "", is_active: true, country_code: "" })
  const [filterRole, setFilterRole] = useState("")
  const [reinviting, setReinviting] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const data = await listStudioUsersAction(filterRole ? { center_role: filterRole } : undefined)
    setUsers(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filterRole]) // eslint-disable-line react-hooks/exhaustive-deps

  const field = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const created = await createStudioUserAction({
        email: form.email.trim(),
        username: form.username.trim(),
        full_name: form.full_name.trim() || undefined,
        center_role: form.center_role,
        center_id: form.center_id.trim() || undefined,
        country_code: form.country_code || undefined,
        password: form.password.trim() || undefined,
      })
      setUsers((u) => [created, ...u])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.dashboard.common.error_unknown)
    } finally {
      setSaving(false)
    }
  }

  async function handleReinvite(userId: string) {
    setReinviting(userId)
    setError(null)
    try {
      await reinviteStudioUserAction(userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.dashboard.common.error_unknown)
    } finally {
      setReinviting(null)
    }
  }

  async function handlePatch(userId: string) {
    setSaving(true)
    setError(null)
    try {
      const updated = await patchStudioUserAction(userId, {
        center_role: editForm.center_role,
        is_active: editForm.is_active,
        country_code: editForm.country_code || undefined,
      })
      setUsers((u) => u.map((x) => (x.id === updated.id ? updated : x)))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.dashboard.common.error_unknown)
    } finally {
      setSaving(false)
    }
  }

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      national_admin: "bg-blue-100 text-blue-700",
      coordinator: "bg-amber-100 text-amber-700",
      volunteer: "bg-zinc-100 text-zinc-600",
    }
    return colors[role] ?? "bg-zinc-100 text-zinc-600"
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{t.title}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {users.length === 1 ? t.count_one : t.count_other.replace("{count}", String(users.length))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value="">{t.filter_all_roles}</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            {showForm ? t.cancel : t.new_btn}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</p>
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
              <label className="text-xs text-zinc-500">{t.field_name}</label>
              <input value={form.full_name} onChange={field("full_name")}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400" />
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.field_role}</label>
              <select value={form.center_role} onChange={field("center_role")}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.field_center_id}</label>
              <input value={form.center_id} onChange={field("center_id")} placeholder={t.center_id_placeholder}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400" />
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.field_country}</label>
              <select value={form.country_code} onChange={field("country_code")}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400">
                <option value="">{t.select_country}</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{flagEmoji(c.code)} {c.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-400">{t.country_hint}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.field_temp_password}</label>
              <input type="password" value={form.password} onChange={field("password")} placeholder={t.temp_password_placeholder}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400" />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
              {saving ? t.creating : t.create_btn}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-zinc-400 py-8 text-center">{dict.dashboard.common.loading}</div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{t.col_user}</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{t.field_role}</th>
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
                      {u.center_role ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.is_active ? t.status_active : t.status_inactive}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === u.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <select value={editForm.center_role} onChange={(e) => setEditForm((f) => ({ ...f, center_role: e.target.value }))}
                          className="rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none">
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select value={String(editForm.is_active)} onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.value === "true" }))}
                          className="rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none">
                          <option value="true">{t.status_active}</option>
                          <option value="false">{t.status_inactive}</option>
                        </select>
                        <select value={editForm.country_code} onChange={(e) => setEditForm((f) => ({ ...f, country_code: e.target.value }))}
                          className="rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none">
                          <option value="">{t.select_country}</option>
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{flagEmoji(c.code)} {c.name}</option>
                          ))}
                        </select>
                        <button onClick={() => handlePatch(u.id)} disabled={saving}
                          className="rounded px-2 py-1 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50">
                          {t.save}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100">
                          {t.cancel}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleReinvite(u.id)}
                          disabled={reinviting === u.id || !u.is_active}
                          className="rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 disabled:opacity-40"
                          title={t.reinvite_tooltip}
                        >
                          {reinviting === u.id ? "..." : t.reinvite}
                        </button>
                        <button
                          onClick={() => { setEditingId(u.id); setEditForm({ center_role: u.center_role ?? "volunteer", is_active: u.is_active, country_code: u.country_code ?? "" }) }}
                          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
                        >
                          {t.edit}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400 text-sm">{t.empty}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
