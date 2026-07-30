import type { Metadata } from "next"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

interface Item {
  free_text: string | null
  quantity: number
  unit: string
  reception_status: string | null
}

const STATUS: Record<string, string> = {
  REGISTERED: "Registrada",
  RECEIVED: "Recibida en el centro",
}

const RECEPTION: Record<string, string> = {
  RECEIVED: "Recibido",
  MISSING: "No llegó",
  REJECTED: "No se pudo aceptar",
}

export const metadata: Metadata = { robots: { index: false, follow: false } }

/** Ficha pública del QR: estado y contenido. Ningún dato de la persona donante. */
export default async function PublicDonationPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const res = await fetch(`${API_URL}/v1/d/${encodeURIComponent(code)}`, {
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <div className="text-center">
          <p className="text-sm text-zinc-500">Donación no encontrada</p>
          <p className="mt-1 font-mono text-xs text-zinc-400">{code}</p>
        </div>
      </main>
    )
  }

  const donation: { code: string; status: string; items: Item[] } = await res.json()

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex justify-center border-b border-zinc-100 bg-zinc-50 pb-4 pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}/v1/d/${donation.code}/qr.png`}
            alt={`Código QR ${donation.code}`}
            width={140}
            height={140}
            className="rounded"
          />
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-base font-bold text-zinc-900">{donation.code}</span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
              {STATUS[donation.status] ?? donation.status}
            </span>
          </div>
          <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
            {donation.items.map((item, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-zinc-800">{item.free_text}</span>
                <span className="text-zinc-500">
                  {item.quantity} {item.unit}
                  {item.reception_status && ` · ${RECEPTION[item.reception_status] ?? ""}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-center text-xs text-zinc-400">
            Araguaney · Coordinación humanitaria · araguaney.lat
          </p>
        </div>
      </div>
    </main>
  )
}
