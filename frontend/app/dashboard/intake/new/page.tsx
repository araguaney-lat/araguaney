"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useSession } from "next-auth/react"
import { apiFetch } from "@/lib/api"
import type { Campaign, Center, ProductType, BarcodeResult } from "@/types"
import { createIntakeAction, type BoxDraft } from "@/lib/actions"
import { useOnlineStatus } from "@/components/ConnectivityBanner"
import { useDict } from "@/context/DictionaryContext"

// @zxing/browser is only needed when the camera scanner actually opens —
// keep it out of the initial bundle for this high-traffic intake flow.
const CameraScanner = dynamic(
  () => import("@/components/CameraScanner").then((mod) => mod.CameraScanner),
  { ssr: false }
)

interface BoxRow {
  key: string
  product_type: ProductType | null
  quantity: string
  unit: string
  batch: string
  expiry_date: string
  weight_kg: string
  offlineBlocked: boolean
  // Codigo leido durante la captura. No viaja a la caja: alimenta el catalogo,
  // que aprende que GTIN corresponde al tipo de producto elegido.
  scannedGtin: string
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
    scannedGtin: "",
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

  const lookupBarcode = useCallback(async (gtin: string): Promise<{
    product: ProductType | null
    offlineBlocked: boolean
    notFound: boolean
  }> => {
    setLoading(true)
    try {
      const res = await fetch(`/api/catalog/barcode/${encodeURIComponent(gtin)}`)
      if (res.status === 503) return { product: null, offlineBlocked: true, notFound: false }
      if (res.status === 422 || !res.ok) return { product: null, offlineBlocked: false, notFound: true }
      const data: BarcodeResult = await res.json()
      if (data.source === "local" && data.product_type) {
        return { product: data.product_type, offlineBlocked: false, notFound: false }
      }
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
  const dict = useDict()
  const t = dict.dashboard.intake_new

  const { query, results, loading, search, lookupBarcode } = useProductSearch(campaignId)
  const [showDropdown, setShowDropdown] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState("")
  const [barcodeError, setBarcodeError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const set = (field: keyof BoxRow) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...row, [field]: e.target.value })

  const selectProduct = (pt: ProductType, gtin?: string) => {
    onChange({
      ...row,
      product_type: pt,
      unit: pt.default_unit ?? row.unit,
      offlineBlocked: false,
      scannedGtin: gtin ?? row.scannedGtin,
    })
    setShowDropdown(false)
    setBarcodeInput("")
    setBarcodeError(null)
  }

  const handleBarcode = useCallback(async (gtin: string) => {
    setBarcodeError(null)
    const { product, offlineBlocked, notFound } = await lookupBarcode(gtin)
    if (product) {
      selectProduct(product, gtin)
    } else if (offlineBlocked) {
      onChange({ ...row, offlineBlocked: true, scannedGtin: gtin })
      setBarcodeError(t.barcode_offline)
    } else if (notFound) {
      // Justo el caso que enseña: el codigo no existe en ningun catalogo, la
      // persona elegira el producto a mano y esa asociacion queda registrada.
      onChange({ ...row, offlineBlocked: false, scannedGtin: gtin })
      setBarcodeError(t.barcode_not_found)
    }
  }, [lookupBarcode, row, onChange, t]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const categoryLabels = dict.dashboard.national.categories
  const isControlled = row.product_type?.is_controlled

  return (
    <div className="rounded-xl border border-cardB bg-card2 p-4 space-y-3">
      {/* Barcode scanner */}
      <div>
        <label className="block text-xs font-medium text-mut mb-1">{t.label_barcode}</label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={barcodeInput}
            placeholder={t.barcode_placeholder}
            className="flex-1 rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={handleBarcodeKeyDown}
          />
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="rounded-lg border border-inpB px-3 py-2 text-lg hover:bg-card2"
            title={t.scan_camera}
          >
            📷
          </button>
        </div>
        {barcodeError && (
          <p className={`mt-1 text-xs ${row.offlineBlocked ? "text-dDraftT" : "text-[var(--dRejT)]"}`}>
            {barcodeError}
          </p>
        )}
        {scanning && (
          <CameraScanner
            onResult={handleCameraScan}
            onClose={() => setScanning(false)}
            label={t.scan_label}
          />
        )}
      </div>

      {/* Product search */}
      <div className="relative">
        <label className="block text-xs font-medium text-mut mb-1">{t.product_label}</label>
        {row.product_type ? (
          <div className="flex items-center justify-between rounded-lg border border-inpB bg-card px-3 py-2">
            <div>
              <p className="text-sm font-medium text-tx">{row.product_type.display_name}</p>
              <p className="text-xs text-mut">
                {categoryLabels[row.product_type.category as keyof typeof categoryLabels] ?? row.product_type.category}
                {row.product_type.is_controlled && (
                  <span className="ml-2 rounded bg-dRejB px-1 py-0.5 text-xs font-medium text-dRejT">
                    {t.product_controlled_badge}
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...row, product_type: null, offlineBlocked: false })}
              className="text-xs text-fnt hover:text-tx"
            >
              {t.product_change}
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={query}
              placeholder={t.product_search_placeholder}
              className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
              onChange={(e) => { search(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
            />
            {loading && <p className="mt-1 text-xs text-fnt">{t.searching}</p>}
            {showDropdown && results.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-cardB bg-card shadow-md">
                {results.map((pt) => (
                  <li key={pt.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-card2"
                      onClick={() => selectProduct(pt)}
                    >
                      <div>
                        <p className="text-sm text-tx">{pt.display_name}</p>
                        <p className="text-xs text-mut">
                          {categoryLabels[pt.category as keyof typeof categoryLabels] ?? pt.category}
                          {pt.inn_name && ` · ${pt.inn_name}`}
                          {pt.is_controlled && (
                            <span className="ml-1 text-[var(--dRejT)]">{t.controlled_warning_emoji}</span>
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
        <div className="rounded-lg bg-dRejB px-3 py-2 text-sm text-dRejT">
          {t.product_controlled_warning}
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-mut mb-1">{t.field_quantity}</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={row.quantity}
            onChange={set("quantity")}
            className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-mut mb-1">{t.field_unit}</label>
          <input
            type="text"
            value={row.unit}
            placeholder={row.product_type?.default_unit ?? t.field_unit_placeholder}
            onChange={set("unit")}
            className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-mut mb-1">{t.field_batch}</label>
          <input
            type="text"
            value={row.batch}
            placeholder={t.field_batch_placeholder}
            onChange={set("batch")}
            className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-mut mb-1">
            {t.field_expiry}
            {row.product_type?.category === "MEDICINE" && <span className="text-[var(--dRejT)] ml-0.5">*</span>}
          </label>
          <input
            type="date"
            value={row.expiry_date}
            onChange={set("expiry_date")}
            className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-mut mb-1">{t.field_weight}</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={row.weight_kg}
            placeholder="5.00"
            onChange={set("weight_kg")}
            className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-[var(--dRejT)] hover:opacity-80"
      >
        {t.remove_box}
      </button>
    </div>
  )
}

// ── Main intake form ──────────────────────────────────────────────────────────

export default function NewIntakePage() {
  const router = useRouter()
  const online = useOnlineStatus()
  const dict = useDict()
  const t = dict.dashboard.intake_new
  const tc = dict.dashboard.common

  const { data: session } = useSession()
  const isNationalAdmin = session?.centerRole === "national_admin"
  const token = session?.accessToken ?? ""

  const [rows, setRows] = useState<BoxRow[]>([newRow()])
  const [campaignId, setCampaignId] = useState("")
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [donante, setDonante] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // national_admin has no home center — they must pick one to attribute
  // this intake to. Coordinator/volunteer never see this, their own center
  // is used automatically server-side.
  const [centers, setCenters] = useState<Center[]>([])
  const [selectedCenterId, setSelectedCenterId] = useState("")

  useEffect(() => {
    if (!isNationalAdmin || !token) return
    apiFetch<Center[]>("/v1/centers", { token })
      .then((data) => {
        setCenters(data)
        if (data.length > 0) setSelectedCenterId((id) => id || data[0].id)
      })
      .catch(() => setCenters([]))
  }, [isNationalAdmin, token])

  useEffect(() => {
    fetch("/api/campaigns/mine")
      .then((r) => r.ok ? r.json() : [])
      .then((data: Campaign[]) => {
        setCampaigns(data)
        if (data.length > 0 && !campaignId) {
          setCampaignId(data[0].id)
        }
      })
      .catch(() => setCampaigns([]))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updateRow = (key: string) => (updated: BoxRow) =>
    setRows((prev) => prev.map((r) => (r.key === key ? updated : r)))

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r.key !== key))

  const addRow = () => setRows((prev) => [...prev, newRow()])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!campaignId) { setError(t.error_campaign); return }
    if (isNationalAdmin && !selectedCenterId) { setError(tc.select_center_label); return }

    for (const row of rows) {
      if (row.offlineBlocked) { setError(t.error_offline_boxes); return }
      if (!row.product_type) { setError(t.error_no_product); return }
      if (row.product_type.is_controlled) { setError(t.error_controlled); return }
      if (!row.unit.trim()) { setError(t.error_unit); return }
    }

    const boxes: BoxDraft[] = rows.map((row) => ({
      product_type_id: row.product_type!.id,
      quantity: parseInt(row.quantity, 10),
      unit: row.unit.trim(),
      batch: row.batch.trim() || undefined,
      expiry_date: row.expiry_date || undefined,
      weight_kg: row.weight_kg ? parseFloat(row.weight_kg) : undefined,
      gtin: row.scannedGtin || undefined,
    }))

    setSubmitting(true)
    const result = await createIntakeAction({
      campaign_id: campaignId,
      donante_libre: donante.trim() || undefined,
      notes: notes.trim() || undefined,
      boxes,
      center_id: isNationalAdmin ? selectedCenterId : undefined,
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
        <h1 className="text-xl font-semibold text-tx">{t.title}</h1>
        <p className="text-sm text-mut mt-1">{t.subtitle}</p>
      </div>

      <div className="mb-4">
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
          online
            ? "bg-dSealB text-dSealT"
            : "bg-dDraftB text-dDraftT"
        }`}>
          <span className={`h-2 w-2 rounded-full ${online ? "bg-[var(--dSealT)]" : "bg-[var(--dDraftT)]"}`} />
          {online ? t.online_status : t.offline_status}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {isNationalAdmin && (
          <div>
            <label className="block text-xs font-medium text-mut mb-1">{tc.select_center_label}</label>
            {centers.length === 0 ? (
              <p className="text-sm text-fnt">{tc.no_centers_available}</p>
            ) : (
              <select
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                required
                className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
              >
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-mut mb-1">{t.campaign_label}</label>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            required
            className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          >
            {campaigns.length === 0 && (
              <option value="">{t.campaigns_loading}</option>
            )}
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.is_general ? "★ " : ""}{c.name}{c.destination_country ? ` (${c.destination_country})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-mut mb-1">{t.donor_label}</label>
            <input
              type="text"
              value={donante}
              placeholder={t.donor_placeholder}
              onChange={(e) => setDonante(e.target.value)}
              className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-mut mb-1">{t.notes_label}</label>
            <input
              type="text"
              value={notes}
              placeholder={t.notes_placeholder}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-tx">
            {t.boxes_header.replace("{count}", String(rows.length))}
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
            className="w-full rounded-lg border-2 border-dashed border-cardB py-3 text-sm text-mut hover:border-sec hover:text-tx"
          >
            {t.add_box}
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-dRejB px-4 py-3 text-sm text-dRejT">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || rows.some((r) => r.offlineBlocked)}
            className="flex-1 rounded-lg bg-[var(--gold)] py-3 text-sm font-medium text-[#3B2A00] hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? t.submitting : t.submit}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-cardB px-4 py-3 text-sm font-medium text-mut hover:bg-card2"
          >
            {t.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}
