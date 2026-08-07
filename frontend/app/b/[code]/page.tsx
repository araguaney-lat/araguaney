"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Turnstile from "react-turnstile"
import type { BoxPublicOut } from "@/types"

type Loc = "es" | "en"

// Scanned from a physical QR (not URL-locale). The box DATA is Spanish
// (admin/catalog); only the UI LABELS follow the scanner's browser language.
const LABELS: Record<Loc, {
  categories: Record<string, string>
  statuses: Record<string, string>
  notFound: string
  qrAlt: string
  quantity: string
  expiry: string
  sealed: string
  delivered: string
  footer: string
  verifying: string
  confirmHuman: string
  loadError: string
  loading: string
  dateLocale: string
}> = {
  es: {
    categories: { MEDICINE: "Medicamento", MEDICAL_SUPPLY: "Insumo médico", FOOD: "Alimento", WATER: "Agua", HYGIENE: "Higiene", TOOL: "Herramienta", RESCUE_GEAR: "Equipo de rescate", OTHER: "Otro" },
    statuses: { DRAFT: "Borrador", SEALED: "Sellada ✓", SHIPPED: "Enviada", REJECTED: "Rechazada" },
    notFound: "Caja no encontrada",
    qrAlt: "Código QR",
    quantity: "Cantidad",
    expiry: "Caducidad",
    sealed: "Sellada",
    delivered: "Entregada en destino",
    footer: "Araguaney · Coordinación humanitaria · araguaney.lat",
    verifying: "Verificando acceso…",
    confirmHuman: "Confirma que eres humano para ver la ficha",
    loadError: "Error al cargar. Intenta de nuevo.",
    loading: "Cargando ficha…",
    dateLocale: "es-MX",
  },
  en: {
    categories: { MEDICINE: "Medicine", MEDICAL_SUPPLY: "Medical supply", FOOD: "Food", WATER: "Water", HYGIENE: "Hygiene", TOOL: "Tool", RESCUE_GEAR: "Rescue gear", OTHER: "Other" },
    statuses: { DRAFT: "Draft", SEALED: "Sealed ✓", SHIPPED: "Shipped", REJECTED: "Rejected" },
    notFound: "Box not found",
    qrAlt: "QR code",
    quantity: "Quantity",
    expiry: "Expiry",
    sealed: "Sealed",
    delivered: "Delivered at destination",
    footer: "Araguaney · Humanitarian coordination · araguaney.lat",
    verifying: "Verifying access…",
    confirmHuman: "Confirm you're human to see the details",
    loadError: "Couldn't load. Try again.",
    loading: "Loading…",
    dateLocale: "en-US",
  },
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  SEALED: "bg-green-100 text-green-800",
  SHIPPED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
}

type PageState = "pending" | "loading" | "done" | "error" | "notfound"

export default function BoxPublicFichaPage() {
  const { code } = useParams<{ code: string }>()
  const [locale] = useState<Loc>(() =>
    typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("en") ? "en" : "es",
  )
  const L = LABELS[locale]
  const [pageState, setPageState] = useState<PageState>("pending")
  const [box, setBox] = useState<BoxPublicOut | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)

  // .trim() guards against a trailing newline in the env var value (a common
  // paste artifact in dashboard UIs) — Turnstile throws an uncaught error on
  // an invalid sitekey, which breaks rendering for the rest of the page.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!.trim()
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? ""

  async function handleVerify(token: string) {
    setPageState("loading")
    try {
      const res = await fetch(`/api/b/${encodeURIComponent(code)}`, {
        headers: { "x-turnstile-token": token },
      })
      if (res.status === 404) {
        setPageState("notfound")
        return
      }
      if (!res.ok) {
        setPageState("error")
        setTurnstileKey((k) => k + 1)
        return
      }
      const data: BoxPublicOut = await res.json()
      setBox(data)
      setPageState("done")
    } catch {
      setPageState("error")
      setTurnstileKey((k) => k + 1)
    }
  }

  if (pageState === "notfound") {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-zinc-500 text-sm">{L.notFound}</p>
          <p className="font-mono text-xs text-zinc-400 mt-1">{code}</p>
        </div>
      </main>
    )
  }

  if (pageState === "done" && box) {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="flex justify-center bg-zinc-50 pt-6 pb-4 border-b border-zinc-100">
            <img
              src={`${publicApiUrl}/b/${code}/qr.png`}
              alt={`${L.qrAlt} ${code}`}
              width={140}
              height={140}
              className="rounded"
            />
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-bold text-zinc-900">{box.code}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[box.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                {L.statuses[box.status] ?? box.status}
              </span>
            </div>

            {/* La caja sigue congelada en SHIPPED: esto viene de su envío. */}
            {box.delivered && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                ✓ {L.delivered}
              </p>
            )}

            <div>
              <p className="text-sm font-semibold text-zinc-800">{box.display_name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {L.categories[box.category] ?? box.category}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">{L.quantity}</dt>
                <dd className="font-medium text-zinc-800">{box.quantity} {box.unit}</dd>
              </div>
              {box.expiry_date && (
                <div>
                  <dt className="text-xs text-zinc-500">{L.expiry}</dt>
                  <dd className="font-medium text-zinc-800">
                    {new Date(box.expiry_date + "T00:00:00").toLocaleDateString(L.dateLocale, {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </dd>
                </div>
              )}
              {box.sealed_at && (
                <div className="col-span-2">
                  <dt className="text-xs text-zinc-500">{L.sealed}</dt>
                  <dd className="font-medium text-zinc-800">
                    {new Date(box.sealed_at).toLocaleString(L.dateLocale, {
                      dateStyle: "short", timeStyle: "short",
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="px-5 pb-4 text-center">
            <p className="text-xs text-zinc-400">{L.footer}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-sm p-6 flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-700">{L.verifying}</p>
          <p className="text-xs text-zinc-400 mt-1">{L.confirmHuman}</p>
        </div>

        {pageState === "error" && (
          <p className="text-xs text-red-500">{L.loadError}</p>
        )}

        <Turnstile
          key={turnstileKey}
          sitekey={siteKey}
          onVerify={handleVerify}
          onExpire={() => setPageState("pending")}
          theme="light"
        />

        {pageState === "loading" && (
          <p className="text-xs text-zinc-400">{L.loading}</p>
        )}
      </div>
    </main>
  )
}
