"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Campaign, ProductType, BarcodeResult } from "@/types"
import { createIntakeAction, type BoxDraft } from "@/lib/actions"
import { CameraScanner } from "@/components/CameraScanner"
import { useOnlineStatus } from "@/components/ConnectivityBanner"

const CATEGORY_LABELS: Record<string, string> = {
  MEDICINE: "Medicamento",
  MEDICAL_SUPPLY: "Insumo médico",
  FOOD: "Alimento",
  WATER: "Agua",
  HYGIENE: "Higiene",
  TOOL: "Herramienta",
  RESCUE_GEAR: "Equipo de rescate",
  OTHER: "Otro",
}

interface BoxRow {
  key: string
  product_type: ProductType | null
  quantity: string
  unit: string
  batch: string
  expiry_date: string
  weight_kg: string
  offlineBlocked: boolean
}

function newRow(): BoxRow {
  return {
    key: crypto.randomUUID(),
    product_type: null,
    quantity: "1",
    unit: "",
    batch: "",
    expiry_date: "",
    weight_kg: "",
    offlineBlocked: false,
  }
}

// ── Product search / barcode ──────────────────────────────────────────────────

function useProductSearch(campaignId: string) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    setQuery(q)
    if (debounce.current) clearTimeout(debounce.current)
    if (q.length < 2) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ q })
        if (campaignId) params.set("campaign_id", campaignId)
        const res = await fetch(`/api/catalog/search?${params}`)
        if (res.ok) setResults(await res.json())
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [campaignId])

  // Returns { product, offlineBlocked, notFound }
  const lookupBarcode = useCallback(async (gtin: string): Promise<{
    product: ProductType | null
    offlineBlocked: boolean
    notFound: boolean
  }> => {
    setLoading(true)
    try {
      const res = await fetch(`/api/catalog/barcode/${encodeURIComponent(gtin)}`)
      if (res.status === 503) {
        return { product: null, offlineBlocked: true, notFound: false }
      }
      if (res.status === 422) {
        return { product: null, offlineBlocked: false, notFound: true }
      }
      if (!res.ok) {
        return { product: null, offlineBlocked: false, notFound: true }
      }
      const data: BarcodeResult = await res.json()
      if (data.source === "local" && data.product_type) {
        return { product: data.product_type, offlineBlocked: false, notFound: false }
      }
      // open_food_facts hit — product not yet in local catalog
      return { product: null, offlineBlocked: false, notFound: true }
    } finally {
      setLoading(false)
    }
  }, [])

  return { query, results, loading, search, lookupBarcode }
}

// ── BoxRow component ──────────────────────────────────────────────────────────

function BoxRowInput({
  row,
  campaignId,
  onChange,
  onRemove,
}: {
  row: BoxRow
  campaignId: string
  onChange: (updated: BoxRow) => void
  onRemove: () => void
}) {
  const { query, results, loading, search, lookupBarcode } = useProductSearch(campaignId)
  const [showDropdown, setShowDropdown] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState("")
  const [barcodeError, setBarcodeError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const set = (field: keyof BoxRow) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...row, [field]: e.target.value })

  const selectProduct = (pt: ProductType) => {
    onChange({ ...row, product_type: pt, unit: pt.default_unit ?? row.unit, offlineBlocked: false })
    setShowDropdown(false)
    setBarcodeInput("")
    setBarcodeError(null)
  }

  const handleBarcode = useCallback(async (gtin: string) => {
    setBarcodeError(null)
    const { product, offlineBlocked, notFound } = await lookupBarcode(gtin)
    if (product) {
      selectProduct(product)
    } else if (offlineBlocked) {
      onChange({ ...row, offlineBlocked: true })
      setBarcodeError("Sin conexión — no se puede registrar el producto. Restablece la conexión e intenta de nuevo.")
    } else if (notFound) {
      onChange({ ...row, offlineBlocked: false })
      setBarcodeError("Producto no encontrado en el catálogo local. Búscalo por nombre o créalo primero.")
    }
  }, [lookupBarcode, row, onChange])

  const handleCameraScan = useCallback(async (text: string) => {
    setScanning(false)
    setBarcodeInput(text)
    await handleBarcode(text)
  }, [handleBarcode])

  const handleBarcodeKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    e.preventDefault()
    const gtin = barcodeInput.trim()
    if (!gtin) return
    await handleBarcode(gtin)
  }

  const isControlled = row.product_type?.is_controlled

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
      {/* Barcode scanner */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">
          Código de barras (GTIN) — escanea o escribe
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={barcodeInput}
            placeholder="8501234567890 ↵"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={handleBarcodeKeyDown}
          />
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-lg hover:bg-zinc-50"
            title="Escanear con cámara"
          >
            📷
          </button>
        </div>
        {barcodeError && (
          <p className={`mt-1 text-xs ${row.offlineBlocked ? "text-amber-700" : "text-red-600"}`}>
            {barcodeError}
          </p>
        )}
        {scanning && (
          <CameraScanner
            onResult={handleCameraScan}
            onClose={() => setScanning(false)}
            label="Apunta al código de barras del producto"
          />
        )}
      </div>

      {/* Product search */}
      <div className="relative">
        <label className="block text-xs font-medium text-zinc-600 mb-1">Producto *</label>
        {row.product_type ? (
          <div className="flex items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2">
            <div>
              <p className="text-sm font-medium text-zinc-900">{row.product_type.display_name}</p>
              <p className="text-xs text-zinc-500">
                {CATEGORY_LABELS[row.product_type.category] ?? row.product_type.category}
                {row.product_type.is_controlled && (
                  <span className="ml-2 rounded bg-red-100 px-1 py-0.5 text-xs font-medium text-red-700">
                    CONTROLADO
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...row, product_type: null, offlineBlocked: false })}
              className="text-xs text-zinc-400 hover:text-zinc-700"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={query}
              placeholder="Buscar por nombre, INN o categoría…"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              onChange={(e) => { search(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
            />
            {loading && <p className="mt-1 text-xs text-zinc-400">Buscando…</p>}
            {showDropdown && results.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-md">
                {results.map((pt) => (
                  <li key={pt.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-zinc-50"
                      onClick={() => selectProduct(pt)}
                    >
                      <div>
                        <p className="text-sm text-zinc-900">{pt.display_name}</p>
                        <p className="text-xs text-zinc-500">
                          {CATEGORY_LABELS[pt.category] ?? pt.category}
                          {pt.inn_name && ` · ${pt.inn_name}`}
                          {pt.is_controlled && (
                            <span className="ml-1 text-red-600">⚠ controlado</span>
                          )}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {isControlled && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Este producto está clasificado como controlado y no puede recibirse en el centro.
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Cantidad *</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={row.quantity}
            onChange={set("quantity")}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Unidad *</label>
          <input
            type="text"
            value={row.unit}
            placeholder={row.product_type?.default_unit ?? "tabletas"}
            onChange={set("unit")}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Lote</label>
          <input
            type="text"
            value={row.batch}
            placeholder="L001"
            onChange={set("batch")}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            Fecha de caducidad
            {row.product_type?.category === "MEDICINE" && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <input
            type="date"
            value={row.expiry_date}
            onChange={set("expiry_date")}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Peso (kg)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={row.weight_kg}
            placeholder="5.00"
            onChange={set("weight_kg")}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-red-500 hover:text-red-700"
      >
        Quitar caja
      </button>
    </div>
  )
}

// ── Main intake form ──────────────────────────────────────────────────────────

export default function NewIntakePage() {
  const router = useRouter()
  const online = useOnlineStatus()
  const [rows, setRows] = useState<BoxRow[]>([newRow()])
  const [campaignId, setCampaignId] = useState("")
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [donante, setDonante] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/campaigns/mine")
      .then((r) => r.ok ? r.json() : [])
      .then((data: Campaign[]) => {
        setCampaigns(data)
        // Auto-select Donaciones Generales (first item, sorted by backend)
        if (data.length > 0 && !campaignId) {
          setCampaignId(data[0].id)
        }
      })
      .catch(() => setCampaigns([]))
  }, [])

  const updateRow = (key: string) => (updated: BoxRow) =>
    setRows((prev) => prev.map((r) => (r.key === key ? updated : r)))

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r.key !== key))

  const addRow = () => setRows((prev) => [...prev, newRow()])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!campaignId) { setError("Selecciona una campaña."); return }

    for (const row of rows) {
      if (row.offlineBlocked) {
        setError("Hay cajas bloqueadas por falta de conexión. Restablece la conexión o elimínalas.")
        return
      }
      if (!row.product_type) { setError("Selecciona un producto para cada caja."); return }
      if (row.product_type.is_controlled) { setError("Elimina productos controlados antes de guardar."); return }
      if (!row.unit.trim()) { setError("Indica la unidad para cada caja."); return }
    }

    const boxes: BoxDraft[] = rows.map((row) => ({
      product_type_id: row.product_type!.id,
      quantity: parseInt(row.quantity, 10),
      unit: row.unit.trim(),
      batch: row.batch.trim() || undefined,
      expiry_date: row.expiry_date || undefined,
      weight_kg: row.weight_kg ? parseFloat(row.weight_kg) : undefined,
    }))

    setSubmitting(true)
    const result = await createIntakeAction({
      campaign_id: campaignId,
      donante_libre: donante.trim() || undefined,
      notes: notes.trim() || undefined,
      boxes,
    })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      router.push("/dashboard/intake")
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Nueva recepción</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Registra cada caja como un ítem homogéneo (un solo producto + lote + caducidad).
        </p>
      </div>

      {/* Connectivity indicator */}
      <div className="mb-4">
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
          online
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }`}>
          <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-amber-500"}`} />
          {online
            ? "Con conexión — búsqueda de barcodes activa"
            : "Sin conexión — solo productos del catálogo local"}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Campaign selector */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            Campaña / Operación *
          </label>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            {campaigns.length === 0 && (
              <option value="">Cargando campañas…</option>
            )}
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.is_general ? "★ " : ""}{c.name}{c.destination_country ? ` (${c.destination_country})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Header fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              Donante (texto libre, sin datos personales)
            </label>
            <input
              type="text"
              value={donante}
              placeholder="Familia García, Empresa XYZ, …"
              onChange={(e) => setDonante(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Notas</label>
            <input
              type="text"
              value={notes}
              placeholder="Observaciones de la recepción…"
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>

        {/* Box rows */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-700">
            Cajas ({rows.length})
          </h2>
          {rows.map((row) => (
            <BoxRowInput
              key={row.key}
              row={row}
              campaignId={campaignId}
              onChange={updateRow(row.key)}
              onRemove={() => removeRow(row.key)}
            />
          ))}
          <button
            type="button"
            onClick={addRow}
            className="w-full rounded-lg border-2 border-dashed border-zinc-300 py-3 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
          >
            + Agregar otra caja
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || rows.some((r) => r.offlineBlocked)}
            className="flex-1 rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {submitting ? "Guardando…" : "Guardar recepción"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
