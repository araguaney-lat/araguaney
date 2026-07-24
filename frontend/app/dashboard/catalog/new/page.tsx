"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConnectivityBanner, useOnlineStatus } from "@/components/ConnectivityBanner"
import { InnAutocomplete } from "@/components/InnAutocomplete"
import { createProductTypeAction, type ProductTypeFormData } from "@/lib/catalog-actions"
import { useDict } from "@/context/DictionaryContext"

export default function NewProductTypePage() {
  const dict = useDict()
  const t = dict.dashboard.catalog_new
  const categories = dict.dashboard.catalog.category
  const router = useRouter()
  const online = useOnlineStatus()

  const [form, setForm] = useState<ProductTypeFormData>({
    category: "MEDICINE",
    display_name: "",
    inn_name: "",
    brand: "",
    strength: "",
    form: "",
    gtin: "",
    default_unit: "",
    is_controlled: false,
    min_shelf_life_days: undefined,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setField = <K extends keyof ProductTypeFormData>(key: K, value: ProductTypeFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!online) return
    setError(null)
    setSubmitting(true)
    const payload: ProductTypeFormData = {
      ...form,
      inn_name: form.inn_name?.trim() || undefined,
      brand: form.brand?.trim() || undefined,
      strength: form.strength?.trim() || undefined,
      form: form.form?.trim() || undefined,
      gtin: form.gtin?.trim() || undefined,
      default_unit: form.default_unit?.trim() || undefined,
    }
    const result = await createProductTypeAction(payload)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.push("/dashboard/catalog")
    }
  }

  const isMedicine = form.category === "MEDICINE"

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-tx">{t.title}</h1>
        <p className="text-sm text-mut mt-1">
          {t.subtitle}
        </p>
      </div>

      {/* Connectivity banner — lookups (RxNorm, barcode) depend on connection */}
      <div className="mb-5">
        <ConnectivityBanner />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-mut mb-1">{t.category_label}</label>
          <select
            value={form.category}
            onChange={(e) => setField("category", e.target.value)}
            required
            className="w-full rounded-lg border border-inpB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
          >
            {Object.entries(categories).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Display name */}
        <div>
          <label className="block text-xs font-medium text-mut mb-1">{t.name_label}</label>
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => setField("display_name", e.target.value)}
            required
            placeholder={t.name_placeholder}
            className="w-full rounded-lg border border-inpB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
          />
        </div>

        {/* INN — RxNorm autocomplete */}
        {isMedicine && (
          <div>
            <label className="block text-xs font-medium text-mut mb-1">
              {t.inn_label}
              {isMedicine && <span className="text-dRejT ml-0.5">*</span>}
            </label>
            <InnAutocomplete
              value={form.inn_name ?? ""}
              onChange={(v) => setField("inn_name", v)}
            />
            <p className="mt-1 text-xs text-fnt">
              {t.inn_hint}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Strength */}
          {isMedicine && (
            <div>
              <label className="block text-xs font-medium text-mut mb-1">{t.strength_label}</label>
              <input
                type="text"
                value={form.strength ?? ""}
                onChange={(e) => setField("strength", e.target.value)}
                placeholder={t.strength_placeholder}
                className="w-full rounded-lg border border-inpB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
              />
            </div>
          )}

          {/* Form */}
          {isMedicine && (
            <div>
              <label className="block text-xs font-medium text-mut mb-1">{t.form_label}</label>
              <input
                type="text"
                value={form.form ?? ""}
                onChange={(e) => setField("form", e.target.value)}
                placeholder={t.form_placeholder}
                className="w-full rounded-lg border border-inpB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
              />
            </div>
          )}

          {/* Brand */}
          <div>
            <label className="block text-xs font-medium text-mut mb-1">{t.brand_label}</label>
            <input
              type="text"
              value={form.brand ?? ""}
              onChange={(e) => setField("brand", e.target.value)}
              placeholder={t.brand_placeholder}
              className="w-full rounded-lg border border-inpB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            />
          </div>

          {/* Default unit */}
          <div>
            <label className="block text-xs font-medium text-mut mb-1">{t.unit_label}</label>
            <input
              type="text"
              value={form.default_unit ?? ""}
              onChange={(e) => setField("default_unit", e.target.value)}
              placeholder={t.unit_placeholder}
              className="w-full rounded-lg border border-inpB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            />
          </div>

          {/* GTIN */}
          <div>
            <label className="block text-xs font-medium text-mut mb-1">{t.gtin_label}</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.gtin ?? ""}
              onChange={(e) => setField("gtin", e.target.value)}
              placeholder={t.gtin_placeholder}
              className="w-full rounded-lg border border-inpB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            />
          </div>

          {/* Min shelf life */}
          <div>
            <label className="block text-xs font-medium text-mut mb-1">
              {t.min_shelf_life_label}
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={form.min_shelf_life_days ?? ""}
              onChange={(e) => setField("min_shelf_life_days", e.target.value ? parseInt(e.target.value, 10) : undefined)}
              placeholder={isMedicine ? "365" : "180"}
              className="w-full rounded-lg border border-inpB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            />
          </div>
        </div>

        {/* Controlled substance */}
        <div className="flex items-center gap-3 rounded-lg border border-cardB bg-card2 px-4 py-3">
          <input
            id="is_controlled"
            type="checkbox"
            checked={form.is_controlled ?? false}
            onChange={(e) => setField("is_controlled", e.target.checked)}
            className="h-4 w-4 rounded border-inpB text-tx"
          />
          <label htmlFor="is_controlled" className="text-sm text-mut">
            {t.controlled_label}
          </label>
        </div>

        {error && (
          <div className="rounded-lg border border-dRejB bg-dRejB px-4 py-3 text-sm text-dRejT">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !online}
            title={!online ? t.offline_tooltip : undefined}
            className="flex-1 rounded-lg bg-[var(--blue)] py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? t.submitting : t.submit}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-inpB px-4 py-3 text-sm font-medium text-mut hover:bg-card2"
          >
            {t.cancel}
          </button>
        </div>

        {!online && (
          <p className="text-xs text-center text-dDraftT">
            {t.offline_notice}
          </p>
        )}
      </form>
    </div>
  )
}
