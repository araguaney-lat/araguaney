"use client"

import { useState } from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import type { Center, UserOut } from "@/types"
import { useDict } from "@/context/DictionaryContext"
import { UserCog, X } from "lucide-react"
import { PageAction } from "@/components/PageAction"

const ROLES = ["volunteer", "coordinator"]
const EMPTY_FORM = { email: "", username: "", full_name: "", center_role: "volunteer" }

function Avatar({ name, avatarUrl, size }: { name: string; avatarUrl: string | null; size: number }) {
  return (
    <span
      className="flex flex-none items-center justify-center overflow-hidden rounded-full bg-dDraftB font-semibold text-dDraftT"
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
    <div className="flex flex-col items-center gap-2 rounded-xl border border-cardB bg-card p-4 text-center">
      <Avatar name={name} avatarUrl={user.avatar_url} size={56} />
      <p className="text-sm font-medium text-tx leading-snug">{name}</p>
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
  const qc = useQueryClient()
  const [selectedCenterId, setSelectedCenterId] = useState<string>("")
  const [showManage, setShowManage] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [success, setSuccess] = useState<string | null>(null)

  // national_admin elige de un selector; el resto solo tiene su propio centro.
  const centersQuery = useQuery({
    queryKey: ["centers"],
    queryFn: () => apiFetch<Center[]>("/v1/centers", { token }),
    enabled: isNationalAdmin && !!token,
  })
  const centers = centersQuery.data ?? []
  // Sin auto-selección por effect: si aún no eligió, cae al primer centro. El
  // selector se ata a este valor efectivo, no al estado crudo.
  const activeCenterId = isNationalAdmin
    ? selectedCenterId || centers[0]?.id || ""
    : session?.centerId ?? ""

  const usersQuery = useQuery({
    queryKey: ["center-users", activeCenterId],
    queryFn: () => apiFetch<UserOut[]>(`/v1/centers/${activeCenterId}/users`, { token }),
    enabled: !!activeCenterId && !!token,
  })
  const users = usersQuery.data ?? []
  const loading = usersQuery.isPending

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<UserOut>(`/v1/centers/${activeCenterId}/users`, {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          username: form.username.trim(),
          full_name: form.full_name.trim() || undefined,
          center_role: form.center_role,
        }),
        token,
      }),
    onSuccess: () => {
      setForm(EMPTY_FORM)
      setShowForm(false)
      setSuccess(t.invite_success)
      qc.invalidateQueries({ queryKey: ["center-users", activeCenterId] })
    },
  })
  const saving = createMutation.isPending

  const reinviteMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/v1/centers/${activeCenterId}/users/${userId}/reinvite`, { method: "POST", token }),
    onSuccess: () => setSuccess(t.reinvite_success),
  })
  const reinviting = reinviteMutation.isPending ? (reinviteMutation.variables ?? null) : null

  // Error mostrado: el de la carga de miembros o el de la última acción.
  const error =
    [usersQuery.error, createMutation.error, reinviteMutation.error].find(
      (e): e is Error => e instanceof Error,
    )?.message ?? null

  const field = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!activeCenterId) return
    setSuccess(null)
    createMutation.mutate()
  }

  function handleReinvite(userId: string) {
    if (!activeCenterId) return
    setSuccess(null)
    reinviteMutation.mutate(userId)
  }

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      coordinator: "bg-dDraftB text-dDraftT",
      volunteer: "bg-chip text-mut",
    }
    return colors[role] ?? "bg-chip text-mut"
  }

  const coordinators = users.filter((u) => u.center_role === "coordinator")
  const volunteers = users.filter((u) => u.center_role === "volunteer")

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-tx">{t.title}</h1>
          <p className="text-sm text-mut mt-0.5">
            {users.length === 1 ? t.members_count_one : t.members_count_other.replace("{count}", String(users.length))}
          </p>
        </div>
        {canManage && (
          <PageAction
            onClick={() => { setShowManage((v) => !v); setShowForm(false); createMutation.reset(); reinviteMutation.reset(); setSuccess(null) }}
            icon={showManage ? X : UserCog}
            label={showManage ? t.cancel : t.manage_team}
          />
        )}
      </div>

      {isNationalAdmin && (
        <div className="mb-6 max-w-xs">
          <label className="text-xs text-mut">{t.select_center_label}</label>
          {centers.length === 0 ? (
            <p className="mt-1 text-sm text-fnt">{t.no_centers}</p>
          ) : (
            <select
              value={activeCenterId}
              onChange={(e) => setSelectedCenterId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-cardB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            >
              {centers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-fnt py-8 text-center">{dict.dashboard.common.loading}</div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold text-mut mb-3">{t.coordinators_heading}</h2>
            {coordinators.length === 0 ? (
              <p className="text-sm text-fnt">{t.no_coordinators}</p>
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
            <h2 className="text-sm font-semibold text-mut mb-3">{t.volunteers_heading}</h2>
            {volunteers.length === 0 ? (
              <p className="text-sm text-fnt">{t.no_volunteers}</p>
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
        <div className="mt-10 pt-8 border-t border-cardB">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-tx">{t.manage_team}</h2>
            <button
              onClick={() => { setShowForm((v) => !v); createMutation.reset(); setSuccess(null) }}
              className="rounded-lg bg-[var(--blue)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              {showForm ? t.cancel : t.invite_btn}
            </button>
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-dRejB border border-dRejB px-3 py-2 text-xs text-dRejT">{error}</p>
          )}
          {success && (
            <p className="mb-4 rounded-lg bg-dSealB border border-dSealB px-3 py-2 text-xs text-dSealT">{success}</p>
          )}

          {showForm && (
            <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-cardB bg-card p-5 space-y-3">
              <p className="text-sm font-medium text-mut">{t.form_title}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-mut">{t.field_email}</label>
                  <input required type="email" value={form.email} onChange={field("email")} placeholder="usuario@centro.org"
                    className="mt-1 w-full rounded-lg border border-cardB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]" />
                </div>
                <div>
                  <label className="text-xs text-mut">{t.field_username}</label>
                  <input required value={form.username} onChange={field("username")} placeholder="usuario123"
                    className="mt-1 w-full rounded-lg border border-cardB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]" />
                </div>
                <div>
                  <label className="text-xs text-mut">{t.field_full_name}</label>
                  <input value={form.full_name} onChange={field("full_name")}
                    className="mt-1 w-full rounded-lg border border-cardB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]" />
                </div>
                <div>
                  <label className="text-xs text-mut">{t.field_role}</label>
                  <select value={form.center_role} onChange={field("center_role")}
                    className="mt-1 w-full rounded-lg border border-cardB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]">
                    {ROLES.map((r) => <option key={r} value={r}>{t.roles[r as keyof typeof t.roles]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                  {saving ? t.inviting : t.invite_action}
                </button>
              </div>
            </form>
          )}

          <div className="rounded-xl border border-cardB bg-card overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-card2 border-b border-cardB">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mut">{t.col_member}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mut">{t.col_role}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mut hidden sm:table-cell">{t.col_status}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-card2/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-tx">{u.full_name ?? u.username}</p>
                      <p className="text-xs text-mut">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge(u.center_role ?? "")}`}>
                        {u.center_role ? t.roles[u.center_role as keyof typeof t.roles] ?? u.center_role : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? "bg-dSealB text-dSealT" : "bg-dRejB text-dRejT"}`}>
                        {u.is_active ? t.status_active : t.status_inactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleReinvite(u.id)}
                        disabled={reinviting === u.id || !u.is_active}
                        className="rounded px-2 py-1 text-xs text-dDraftT hover:bg-dDraftB disabled:opacity-40"
                      >
                        {reinviting === u.id ? "..." : t.reinvite}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-fnt text-sm">{t.empty}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
