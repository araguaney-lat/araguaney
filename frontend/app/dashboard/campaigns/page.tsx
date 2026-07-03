"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { createCampaignAction, updateCampaignAction } from "@/lib/campaign-actions"
import { COUNTRIES, countryName, flagEmoji } from "@/lib/countries"
import type { Campaign, Center } from "@/types"
import { useDict } from "@/context/DictionaryContext"

const EMPTY_FORM = {
  name: "",
  origin_country: "",
  destination_country: "",
  description: "",
  start_date: "",
  end_date: "",
}

export default function CampaignsPage() {
  const dict = useDict()
  const t = dict.dashboard.campaigns

  const { data: session, status } = useSession()
  const isAdmin = session?.centerRole === "national_admin"

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [centers, setCenters] = useState<Center[]>([])
  const [selectedCenterIds, setSelectedCenterIds] = useState<string[]>([])

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [status])

  useEffect(() => {
    if (!showForm || !isAdmin) return
    fetch("/api/centers")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCenters)
      .catch(() => setCenters([]))
  }, [showForm, isAdmin])

  function toggleCenter(centerId: string) {
    setSelectedCenterIds((ids) =>
      ids.includes(centerId) ? ids.filter((id) => id !== centerId) : [...ids, centerId]
    )
  }

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
        origin_country: form.origin_country || undefined,
        destination_country: form.destination_country || undefined,
        description: form.description || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        center_ids: selectedCenterIds.length > 0 ? selectedCenterIds : undefined,
      })
      setCampaigns((cs) => [created, ...cs])
      closeForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.dashboard.common.error_unknown)
    } finally {
      setSaving(false)
    }
  }

  function closeForm() {
    setForm(EMPTY_FORM)
    setSelectedCenterIds([])
    setError(null)
    setShowForm(false)
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
    return <div className="text-sm text-zinc-400 py-8 text-center">{dict.dashboard.common.loading}</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{t.title_full}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {campaigns.length === 1 ? t.count_one : t.count_other.replace("{count}", String(campaigns.length))}
          </span>
          {isAdmin && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              {t.new}
            </button>
          )}
        </div>
      </div>

      {showForm && isAdmin && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 space-y-3"
        >
          <p className="text-sm font-medium text-zinc-700">{t.form_title}</p>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-500">{t.field_name_required}</label>
              <input
                required
                value={form.name}
                onChange={field("name")}
                placeholder={t.field_name_placeholder}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.field_origin}</label>
              <select
                value={form.origin_country}
                onChange={field("origin_country")}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">{t.select_country}</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {flagEmoji(c.code)} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.field_destination}</label>
              <select
                value={form.destination_country}
                onChange={field("destination_country")}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">{t.select_country}</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {flagEmoji(c.code)} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.field_start_date}</label>
              <input
                type="date"
                value={form.start_date}
                onChange={field("start_date")}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">{t.field_end_date}</label>
              <input
                type="date"
                value={form.end_date}
                onChange={field("end_date")}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-500">{t.field_description}</label>
              <textarea
                value={form.description}
                onChange={field("description")}
                rows={2}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100">
            <label className="text-xs text-zinc-500">{t.field_centers}</label>
            <p className="text-xs text-zinc-400 mt-0.5 mb-2">{t.field_centers_help}</p>
            {centers.length === 0 ? (
              <p className="text-xs text-zinc-400">{t.no_centers_available}</p>
            ) : (
              <>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200 divide-y divide-zinc-100">
                  {centers.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCenterIds.includes(c.id)}
                        onChange={() => toggleCenter(c.id)}
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
                {selectedCenterIds.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-1.5">
                    {selectedCenterIds.length === 1
                      ? t.centers_selected_one
                      : t.centers_selected_other.replace("{count}", String(selectedCenterIds.length))}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving ? t.saving : t.create}
            </button>
          </div>
        </form>
      )}

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          {isAdmin ? t.empty_admin : t.empty_user}
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
                  title={isAdmin ? (c.is_active ? t.toggle_deactivate : t.toggle_activate) : undefined}
                >
                  {c.is_active ? t.active : t.inactive}
                </button>
              </div>

              {(c.origin_country || c.destination_country) && (
                <p className="text-xs font-medium text-zinc-600">
                  {c.origin_country && (
                    <>{flagEmoji(c.origin_country)} {countryName(c.origin_country)}</>
                  )}
                  {c.origin_country && c.destination_country && " → "}
                  {c.destination_country && (
                    <>{flagEmoji(c.destination_country)} {countryName(c.destination_country)}</>
                  )}
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
                  {t.view_members}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
