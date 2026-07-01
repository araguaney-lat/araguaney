"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import type { CampaignMember, Campaign, Center, UserOut } from "@/types"

const ROLE_LABELS: Record<string, string> = {
  national_admin: "Admin nacional",
  coordinator: "Coordinador",
  volunteer: "Voluntario",
}

const ROLE_COLORS: Record<string, string> = {
  national_admin: "bg-purple-100 text-purple-700",
  coordinator: "bg-blue-100 text-blue-700",
  volunteer: "bg-zinc-100 text-zinc-600",
}

export default function CampaignMembersPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const isAdmin = session?.centerRole === "national_admin"
  const userCenterId = session?.centerId ?? null

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [members, setMembers] = useState<CampaignMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add-member panel state
  const [addOpen, setAddOpen] = useState(false)
  const [centers, setCenters] = useState<Center[]>([])
  const [selectedCenterId, setSelectedCenterId] = useState<string>("")
  const [centerUsers, setCenterUsers] = useState<UserOut[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Removing state: userId being removed
  const [removing, setRemoving] = useState<string | null>(null)

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

  // When add panel opens, load center list (admin) or set coordinator's center
  useEffect(() => {
    if (!addOpen) return
    setSelectedUserId("")
    setCenterUsers([])
    setAddError(null)

    if (isAdmin) {
      fetch("/api/centers")
        .then((r) => r.ok ? r.json() : [])
        .then(setCenters)
    } else {
      // Coordinator: pre-set their own center
      if (userCenterId) {
        setSelectedCenterId(userCenterId)
      }
    }
  }, [addOpen, isAdmin, userCenterId])

  // When center selected, fetch its users
  useEffect(() => {
    if (!selectedCenterId) {
      setCenterUsers([])
      return
    }
    setLoadingUsers(true)
    setSelectedUserId("")
    fetch(`/api/centers/${selectedCenterId}/users`)
      .then((r) => r.ok ? r.json() : [])
      .then((users: UserOut[]) => {
        // Filter out users already in the campaign
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
        setAddError(data?.detail ?? "Error al agregar el miembro")
        return
      }
      await fetchMembers()
      setAddOpen(false)
      setSelectedCenterId("")
      setSelectedUserId("")
    } catch {
      setAddError("Error de red")
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
        setError(data?.detail ?? "Error al remover el miembro")
        return
      }
      setMembers((prev) => prev.filter((m) => m.id !== userId))
    } catch {
      setError("Error de red")
    } finally {
      setRemoving(null)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-zinc-400">Cargando...</div>
  }

  const isGeneral = campaign?.is_general ?? false

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/campaigns"
          className="text-sm text-zinc-500 hover:text-zinc-800 flex items-center gap-1 mb-3"
        >
          ← Campañas
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">
              {campaign?.name ?? "Campaña"}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {members.length} miembro{members.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            {addOpen ? "Cancelar" : "+ Agregar miembro"}
          </button>
        </div>
      </div>

      {isGeneral && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Los usuarios se asignan automáticamente a <strong>Donaciones Generales</strong> al ser
          creados. No es posible removerlos de esta campaña.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add-member panel */}
      {addOpen && (
        <div className="mb-5 rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
          <p className="text-sm font-medium text-zinc-700">Agregar miembro</p>

          {addError && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {addError}
            </p>
          )}

          {isAdmin && (
            <div>
              <label className="text-xs text-zinc-500">Centro</label>
              <select
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">— Seleccionar centro —</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-500">Usuario</label>
            {loadingUsers ? (
              <p className="text-xs text-zinc-400 mt-1">Cargando usuarios...</p>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={!selectedCenterId && isAdmin}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50"
              >
                <option value="">
                  {!selectedCenterId && isAdmin
                    ? "Selecciona un centro primero"
                    : centerUsers.length === 0
                    ? "Sin usuarios disponibles"
                    : "— Seleccionar usuario —"}
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
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {adding ? "Agregando..." : "Agregar"}
            </button>
          </div>
        </div>
      )}

      {/* Members table */}
      {members.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          Sin miembros registrados.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Rol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Estado
                </th>
                {!isGeneral && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{m.username}</p>
                    <p className="text-xs text-zinc-400">{m.email}</p>
                    {m.full_name && (
                      <p className="text-xs text-zinc-400">{m.full_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.center_role ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ROLE_COLORS[m.center_role] ?? "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {ROLE_LABELS[m.center_role] ?? m.center_role}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {m.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {!isGeneral && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(m.id)}
                        disabled={removing === m.id}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        {removing === m.id ? "Removiendo..." : "Remover"}
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
