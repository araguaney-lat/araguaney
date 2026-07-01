"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConnectivityBanner, useOnlineStatus } from "@/components/ConnectivityBanner"
import { InnAutocomplete } from "@/components/InnAutocomplete"
import { createProductTypeAction, type ProductTypeFormData } from "@/lib/catalog-actions"

const CATEGORIES = [
  { value: "MEDICINE", label: "Medicamento" },
  { value: "MEDICAL_SUPPLY", label: "Insumo médico" },
  { value: "FOOD", label: "Alimento" },
  { value: "WATER", label: "Agua" },
  { value: "HYGIENE", label: "Higiene" },
  { value: "TOOL", label: "Herramienta" },
  { value: "RESCUE_GEAR", label: "Equipo de rescate" },
  { value: "OTHER", label: "Otro" },
]

export default function NewProductTypePage() {
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
        <h1 className="text-xl font-semibold text-zinc-900">Nuevo tipo de producto</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Define el SKU que usarán las cajas de este centro.
        </p>
      </div>

      {/* Connectivity banner — lookups (RxNorm, barcode) depend on connection */}
      <div className="mb-5">
        <ConnectivityBanner />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Categoría *</label>
          <select
            value={form.category}
            onChange={(e) => setField("category", e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Display name */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre *</label>
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => setField("display_name", e.target.value)}
            required
            placeholder="Ibuprofeno 400mg tabletas"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        {/* INN — RxNorm autocomplete */}
        {isMedicine && (
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              INN (Denominación Común Internacional)
              {isMedicine && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <InnAutocomplete
              value={form.inn_name ?? ""}
              onChange={(v) => setField("inn_name", v)}
            />
            <p className="mt-1 text-xs text-zinc-400">
              Nombre genérico normalizado por OMS — con conexión se sugiere vía RxNorm.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Strength */}
          {isMedicine && (
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Concentración</label>
              <input
                type="text"
                value={form.strength ?? ""}
                onChange={(e) => setField("strength", e.target.value)}
                placeholder="400mg"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          )}

          {/* Form */}
          {isMedicine && (
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Forma farmacéutica</label>
              <input
                type="text"
                value={form.form ?? ""}
                onChange={(e) => setField("form", e.target.value)}
                placeholder="tableta, jarabe, inyectable…"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          )}

          {/* Brand */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Marca</label>
            <input
              type="text"
              value={form.brand ?? ""}
              onChange={(e) => setField("brand", e.target.value)}
              placeholder="Advil, genérico…"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {/* Default unit */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Unidad por defecto</label>
            <input
              type="text"
              value={form.default_unit ?? ""}
              onChange={(e) => setField("default_unit", e.target.value)}
              placeholder="tabletas, latas, litros…"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {/* GTIN */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">GTIN / Código de barras</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.gtin ?? ""}
              onChange={(e) => setField("gtin", e.target.value)}
              placeholder="EAN-8, UPC-A o EAN-13"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {/* Min shelf life */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              Vida útil mínima (días)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={form.min_shelf_life_days ?? ""}
              onChange={(e) => setField("min_shelf_life_days", e.target.value ? parseInt(e.target.value, 10) : undefined)}
              placeholder={isMedicine ? "365" : "180"}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>

        {/* Controlled substance */}
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
          <input
            id="is_controlled"
            type="checkbox"
            checked={form.is_controlled ?? false}
            onChange={(e) => setField("is_controlled", e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
          />
          <label htmlFor="is_controlled" className="text-sm text-zinc-700">
            Sustancia controlada — bloqueado en intake
          </label>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !online}
            title={!online ? "Requiere conexión para crear un nuevo tipo de producto" : undefined}
            className="flex-1 rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {submitting ? "Guardando…" : "Crear tipo de producto"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancelar
          </button>
        </div>

        {!online && (
          <p className="text-xs text-center text-amber-600">
            Sin conexión — no se pueden crear nuevos tipos de producto.
          </p>
        )}
      </form>
    </div>
  )
}
