import { notFound } from "next/navigation"
import { StatusTimeline } from "@/components/StatusTimeline"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700",
  SEALED: "bg-green-100 text-green-700",
  SHIPPED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  OPEN: "bg-amber-100 text-amber-700",
  CLOSED: "bg-green-100 text-green-700",
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  SEALED: "Sellada",
  SHIPPED: "Despachada",
  REJECTED: "Rechazada",
  OPEN: "Abierta",
  CLOSED: "Cerrada",
}

function fmt(kg: number | null | undefined): string {
  if (kg == null) return "—"
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`
  return `${Number(kg).toFixed(1)} kg`
}

interface QrEvent {
  from_status: string | null
  to_status: string
  note: string | null
  ts: string
}

interface BoxFicha {
  kind: "box"
  code: string
  status: string
  display_name: string
  category: string
  inn_name: string | null
  strength: string | null
  form: string | null
  batch: string | null
  expiry_date: string | null
  quantity: number
  unit: string
  weight_kg: number | null
  center_name: string
  campaign_name: string | null
  sealed_at: string | null
  created_at: string
  events: QrEvent[]
}

interface PalletBoxRow {
  display_name: string
  category: string
  quantity: number
  unit: string
  weight_kg: number | null
}

interface PalletFicha {
  kind: "pallet"
  code: string
  status: string
  center_name: string
  box_count: number
  total_weight_kg: number | null
  closed_at: string | null
  created_at: string
  boxes: PalletBoxRow[]
  events: QrEvent[]
}

type Ficha = BoxFicha | PalletFicha

async function fetchFicha(code: string): Promise<Ficha | null> {
  try {
    const res = await fetch(`${API_URL}/v1/public/qr/${encodeURIComponent(code)}`, {
      next: { revalidate: 60, tags: [`qr-${code}`] },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function QrFichaPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const ficha = await fetchFicha(code)

  if (!ficha) notFound()

  const statusColor = STATUS_COLORS[ficha.status] ?? "bg-zinc-100 text-zinc-700"
  const statusLabel = STATUS_LABELS[ficha.status] ?? ficha.status

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-zinc-400 font-mono mb-1">{ficha.code}</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 leading-tight">
              {ficha.kind === "box" ? ficha.display_name : `Tarima ${ficha.code}`}
            </h1>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {ficha.kind === "box" && <BoxSection ficha={ficha} />}
        {ficha.kind === "pallet" && <PalletSection ficha={ficha} />}

        {/* Timeline */}
        {ficha.events.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
              Historial
            </h2>
            <StatusTimeline events={ficha.events} />
          </section>
        )}

        <p className="mt-10 text-center text-xs text-zinc-300">
          Generado por Acopio · datos al momento del escaneo
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-900 text-right max-w-[60%]">{value ?? "—"}</span>
    </div>
  )
}

function BoxSection({ ficha }: { ficha: BoxFicha }) {
  return (
    <>
      {/* Product details */}
      <section className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 mb-4">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Producto</p>
        </div>
        <div className="px-4">
          <Row label="Categoría" value={CATEGORY_LABELS[ficha.category] ?? ficha.category} />
          {ficha.inn_name && <Row label="INN" value={ficha.inn_name} />}
          {ficha.strength && <Row label="Concentración" value={ficha.strength} />}
          {ficha.form && <Row label="Forma farmacéutica" value={ficha.form} />}
        </div>
      </section>

      {/* Lot / expiry */}
      <section className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 mb-4">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Lote y caducidad</p>
        </div>
        <div className="px-4">
          <Row label="Lote" value={ficha.batch} />
          <Row
            label="Caducidad"
            value={
              ficha.expiry_date
                ? new Date(ficha.expiry_date).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : null
            }
          />
        </div>
      </section>

      {/* Quantity & weight */}
      <section className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 mb-4">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Cantidad y peso</p>
        </div>
        <div className="px-4">
          <Row label="Cantidad" value={`${ficha.quantity} ${ficha.unit}`} />
          <Row label="Peso" value={fmt(ficha.weight_kg)} />
        </div>
      </section>

      {/* Context */}
      <section className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Origen</p>
        </div>
        <div className="px-4">
          <Row label="Centro" value={ficha.center_name} />
          {ficha.campaign_name && <Row label="Campaña" value={ficha.campaign_name} />}
          <Row
            label="Sellada"
            value={
              ficha.sealed_at
                ? new Date(ficha.sealed_at).toLocaleString("es-MX", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null
            }
          />
        </div>
      </section>
    </>
  )
}

function PalletSection({ ficha }: { ficha: PalletFicha }) {
  return (
    <>
      {/* Summary */}
      <section className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 mb-4">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Resumen</p>
        </div>
        <div className="px-4">
          <Row label="Centro" value={ficha.center_name} />
          <Row label="Cajas" value={String(ficha.box_count)} />
          <Row label="Peso total" value={fmt(ficha.total_weight_kg)} />
          <Row
            label="Cerrada"
            value={
              ficha.closed_at
                ? new Date(ficha.closed_at).toLocaleString("es-MX", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null
            }
          />
        </div>
      </section>

      {/* Box list */}
      {ficha.boxes.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              Contenido ({ficha.boxes.length} cajas)
            </p>
          </div>
          <ul className="divide-y divide-zinc-100">
            {ficha.boxes.map((b, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{b.display_name}</p>
                  <p className="text-xs text-zinc-400">
                    {CATEGORY_LABELS[b.category] ?? b.category}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-zinc-900">
                    {b.quantity} {b.unit}
                  </p>
                  <p className="text-xs text-zinc-400">{fmt(b.weight_kg)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
