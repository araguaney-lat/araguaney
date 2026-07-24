"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import type { CampaignMember, Campaign, Center, UserOut } from "@/types"
import { useDict } from "@/context/DictionaryContext"

const ROLE_COLORS: Record<string, string> = {
  national_admin: "bg-goldSoft text-[var(--gold)]",
  coordinator: "bg-blueSoft text-[var(--blue)]",
  volunteer: "bg-chip text-mut",
}

export default function CampaignMembersPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const dict = useDict()
  const t = dict.dashboard.campaign_members

  const isAdmin = session?.centerRole === "national_admin"
  const userCenterId = session?.centerId ?? null

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [members, setMembers] = useState<CampaignMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [centers, setCenters] = useState<Center[]>([])
  const [selectedCenterId, setSelectedCenterId] = useState<string>("")
  const [centerUsers, setCenterUsers] = useState<UserOut[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const ROLE_LABELS: Record<string, string> = {
    national_admin: t.role_national_admin,
    coordinator: t.role_coordinator,
    volunteer: t.role_volunteer,
  }

  const fetchMembers = useCallback(async () => {
    const [campRes, membRes] = await Promise.all([
      fetch(`/api/campaigns`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/campaigns/${id}/members`).then((r) => r.ok ? r.json() : []),
    ])
    const camp = (campRes as Campaign[]).find((c: Campaign) => c.id === id) ?? null
    setCampaign(camp)
    setMembers(membRes)
  }, [id])

  useEffect(() => {
    fetchMembers().finally(() => setLoading(false))
  }, [fetchMembers])

  useEffect(() => {
    if (!addOpen) return
    setSelectedUserId("")
    setCenterUsers([])
    setAddError(null)

    if (isAdmin) {
      fetch("/api/centers")
        .then((r) => r.ok ? r.json() : [])
        .then(setCenters)
    } else if (userCenterId) {
      setSelectedCenterId(userCenterId)
    }
  }, [addOpen, isAdmin, userCenterId])

  useEffect(() => {
    if (!selectedCenterId) { setCenterUsers([]); return }
    setLoadingUsers(true)
    setSelectedUserId("")
    fetch(`/api/centers/${selectedCenterId}/users`)
      .then((r) => r.ok ? r.json() : [])
      .then((users: UserOut[]) => {
        const memberIds = new Set(members.map((m) => m.id))
        setCenterUsers(users.filter((u) => !memberIds.has(u.id)))
      })
      .finally(() => setLoadingUsers(false))
  }, [selectedCenterId, members])

  async function handleAdd() {
    if (!selectedUserId) return
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/campaigns/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUserId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setAddError(data?.detail ?? dict.dashboard.common.error_unknown)
        return
      }
      await fetchMembers()
      setAddOpen(false)
      setSelectedCenterId("")
      setSelectedUserId("")
    } catch {
      setAddError(dict.dashboard.common.error_unknown)
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(userId: string) {
    setRemoving(userId)
    setError(null)
    try {
      const res = await fetch(`/api/campaigns/${id}/members/${userId}`, { method: "DELETE" })
      if (!res.ok && res.status !== 204) {
        const data = await res.json()
        setError(data?.detail ?? dict.dashboard.common.error_unknown)
        return
      }
      setMembers((prev) => prev.filter((m) => m.id !== userId))
    } catch {
      setError(dict.dashboard.common.error_unknown)
    } finally {
      setRemoving(null)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-fnt">{dict.dashboard.common.loading}</div>
  }

  const isGeneral = campaign?.is_general ?? false
  const memberCount = members.length === 1 ? t.members_count_one : t.members_count_other.replace("{count}", String(members.length))

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          href="/dashboard/campaigns"
          className="text-sm text-mut hover:text-tx flex items-center gap-1 mb-3"
        >
          {t.back}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-tx">{campaign?.name ?? t.fallback_name}</h1>
            <p className="text-sm text-mut mt-0.5">{memberCount}</p>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {addOpen ? t.cancel : t.add_btn}
          </button>
        </div>
      </div>

      {isGeneral && (
        <div
          className="mb-4 rounded-lg border border-[var(--blue)] bg-blueSoft px-4 py-3 text-sm text-[var(--blue)]"
          dangerouslySetInnerHTML={{ __html: t.general_notice }}
        />
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-dRejB bg-dRejB px-4 py-3 text-sm text-dRejT">
          {error}
        </div>
      )}

      {addOpen && (
        <div className="mb-5 rounded-xl border border-cardB bg-card p-4 space-y-3">
          <p className="text-sm font-medium text-mut">{t.add_panel_title}</p>

          {addError && (
            <p className="rounded-lg bg-dRejB border border-dRejB px-3 py-2 text-xs text-dRejT">{addError}</p>
          )}

          {isAdmin && (
            <div>
              <label className="text-xs text-mut">{t.select_center_label}</label>
              <select
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-cardB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
              >
                <option value="">{t.select_center_placeholder}</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-mut">{t.select_user_label}</label>
            {loadingUsers ? (
              <p className="text-xs text-fnt mt-1">{t.loading_users}</p>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={!selectedCenterId && isAdmin}
                className="mt-1 w-full rounded-lg border border-cardB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)] disabled:opacity-50"
              >
                <option value="">
                  {!selectedCenterId && isAdmin
                    ? t.center_select_first
                    : centerUsers.length === 0
                    ? t.no_users_available
                    : t.select_user_placeholder}
                </option>
                {centerUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} — {u.email}
                    {u.full_name ? ` (${u.full_name})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !selectedUserId}
              className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {adding ? t.adding : t.add_action}
            </button>
          </div>
        </div>
      )}

      {members.length === 0 ? (
        <div className="rounded-xl border border-cardB bg-card p-8 text-center text-sm text-mut">
          {t.empty}
        </div>
      ) : (
        <div className="rounded-xl border border-cardB bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-card2">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-mut uppercase tracking-wide">{t.col_user}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-mut uppercase tracking-wide">{t.col_role}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-mut uppercase tracking-wide">{t.col_status}</th>
                {!isGeneral && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-mut uppercase tracking-wide">{t.col_actions}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-card2">
                  <td className="px-4 py-3">
                    <p className="font-medium text-tx">{m.username}</p>
                    <p className="text-xs text-fnt">{m.email}</p>
                    {m.full_name && <p className="text-xs text-fnt">{m.full_name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {m.center_role ? (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[m.center_role] ?? "bg-chip text-mut"}`}>
                        {ROLE_LABELS[m.center_role] ?? m.center_role}
                      </span>
                    ) : (
                      <span className="text-xs text-fnt">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${m.is_active ? "bg-dSealB text-dSealT" : "bg-chip text-mut"}`}>
                      {m.is_active ? t.status_active : t.status_inactive}
                    </span>
                  </td>
                  {!isGeneral && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(m.id)}
                        disabled={removing === m.id}
                        className="text-xs text-dRejT hover:text-dRejT disabled:opacity-50"
                      >
                        {removing === m.id ? t.removing : t.remove_btn}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
