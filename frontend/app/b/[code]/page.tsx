"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Turnstile from "react-turnstile"
import type { BoxPublicOut } from "@/types"

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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  SEALED: "Sellada ✓",
  SHIPPED: "Enviada",
  REJECTED: "Rechazada",
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
  const [pageState, setPageState] = useState<PageState>("pending")
  const [box, setBox] = useState<BoxPublicOut | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!
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
          <p className="text-zinc-500 text-sm">Caja no encontrada</p>
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
              alt={`QR código ${code}`}
              width={140}
              height={140}
              className="rounded"
            />
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-bold text-zinc-900">{box.code}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[box.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                {STATUS_LABELS[box.status] ?? box.status}
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-800">{box.display_name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {CATEGORY_LABELS[box.category] ?? box.category}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Cantidad</dt>
                <dd className="font-medium text-zinc-800">{box.quantity} {box.unit}</dd>
              </div>
              {box.expiry_date && (
                <div>
                  <dt className="text-xs text-zinc-500">Caducidad</dt>
                  <dd className="font-medium text-zinc-800">
                    {new Date(box.expiry_date + "T00:00:00").toLocaleDateString("es-MX", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </dd>
                </div>
              )}
              {box.sealed_at && (
                <div className="col-span-2">
                  <dt className="text-xs text-zinc-500">Sellada</dt>
                  <dd className="font-medium text-zinc-800">
                    {new Date(box.sealed_at).toLocaleString("es-MX", {
                      dateStyle: "short", timeStyle: "short",
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="px-5 pb-4 text-center">
            <p className="text-xs text-zinc-400">Acopio · Centro coordinador de donaciones humanitarias</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-sm p-6 flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-700">Verificando acceso…</p>
          <p className="text-xs text-zinc-400 mt-1">Confirma que eres humano para ver la ficha</p>
        </div>

        {pageState === "error" && (
          <p className="text-xs text-red-500">Error al cargar. Intenta de nuevo.</p>
        )}

        <Turnstile
          key={turnstileKey}
          sitekey={siteKey}
          onVerify={handleVerify}
          onExpire={() => setPageState("pending")}
          theme="light"
        />

        {pageState === "loading" && (
          <p className="text-xs text-zinc-400">Cargando ficha…</p>
        )}
      </div>
    </main>
  )
}
