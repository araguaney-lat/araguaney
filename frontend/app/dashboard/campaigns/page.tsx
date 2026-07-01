"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { createCampaignAction, updateCampaignAction } from "@/lib/campaign-actions"
import { COUNTRIES, countryName } from "@/lib/countries"
import type { Campaign } from "@/types"

const EMPTY_FORM = {
  name: "",
  destination_country: "",
  description: "",
  start_date: "",
  end_date: "",
}

export default function CampaignsPage() {
  const { data: session, status } = useSession()
  const isAdmin = session?.centerRole === "national_admin"

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [status])

  const field =
    (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const created = await createCampaignAction({
        name: form.name.trim(),
        destination_country: form.destination_country || undefined,
        description: form.description || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
      })
      setCampaigns((cs) => [created, ...cs])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la campaña")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(campaign: Campaign) {
    if (!isAdmin) return
    try {
      const updated = await updateCampaignAction(campaign.id, { is_active: !campaign.is_active })
      setCampaigns((cs) => cs.map((c) => (c.id === updated.id ? updated : c)))
    } catch {
      // ignore
    }
  }

  if (status === "loading" || loading) {
    return <div className="text-sm text-zinc-400 py-8 text-center">Cargando...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Campañas / Operaciones</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Agrupa intakes y envíos por evento humanitario
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {campaigns.length} campaña{campaigns.length !== 1 ? "s" : ""}
          </span>
          {isAdmin && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              {showForm ? "Cancelar" : "+ Nueva campaña"}
            </button>
          )}
        </div>
      </div>

      {showForm && isAdmin && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 space-y-3"
        >
          <p className="text-sm font-medium text-zinc-700">Nueva campaña</p>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-500">Nombre de la campaña *</label>
              <input
                required
                value={form.name}
                onChange={field("name")}
                placeholder="Ej. Operación Venezuela — Terremoto Junio 2026"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">País de destino</label>
              <select
                value={form.destination_country}
                onChange={field("destination_country")}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">— Seleccionar país —</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500">Fecha de inicio</label>
              <input
                type="date"
                value={form.start_date}
                onChange={field("start_date")}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Fecha de cierre estimada</label>
              <input
                type="date"
                value={form.end_date}
                onChange={field("end_date")}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-500">Descripción</label>
              <textarea
                value={form.description}
                onChange={field("description")}
                rows={2}
                placeholder="Contexto de la operación, instrucciones especiales..."
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Crear campaña"}
            </button>
          </div>
        </form>
      )}

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          No hay campañas registradas aún.{" "}
          {isAdmin && "Crea una para comenzar a registrar donaciones."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-zinc-900 leading-snug">{c.name}</span>
                <button
                  onClick={() => toggleActive(c)}
                  disabled={!isAdmin}
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.is_active
                      ? "bg-green-100 text-green-700" + (isAdmin ? " hover:bg-green-200 cursor-pointer" : "")
                      : "bg-zinc-100 text-zinc-500" + (isAdmin ? " hover:bg-zinc-200 cursor-pointer" : "")
                  }`}
                  title={isAdmin ? (c.is_active ? "Clic para desactivar" : "Clic para activar") : undefined}
                >
                  {c.is_active ? "Activa" : "Inactiva"}
                </button>
              </div>

              {c.destination_country && (
                <p className="text-xs font-medium text-zinc-600">
                  Destino: {countryName(c.destination_country)}
                </p>
              )}

              {c.description && (
                <p className="text-xs text-zinc-500 line-clamp-2">{c.description}</p>
              )}

              {(c.start_date || c.end_date) && (
                <p className="text-xs text-zinc-400">
                  {c.start_date && new Date(c.start_date).toLocaleDateString("es-MX")}
                  {c.start_date && c.end_date && " — "}
                  {c.end_date && new Date(c.end_date).toLocaleDateString("es-MX")}
                </p>
              )}

              <div className="pt-1 border-t border-zinc-100">
                <Link
                  href={`/dashboard/campaigns/${c.id}/members`}
                  className="text-xs text-zinc-500 hover:text-zinc-800"
                >
                  Ver miembros →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
