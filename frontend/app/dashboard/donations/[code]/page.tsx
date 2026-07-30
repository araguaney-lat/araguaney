"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { apiFetch } from "@/lib/api"
import { useDict } from "@/context/DictionaryContext"

interface Item {
  id: string
  free_text: string | null
  product_type_id: string | null
  quantity: number
  unit: string
  added_by: string
  reception_status: string | null
}

interface Photo {
  id: string
}

interface Donation {
  id: string
  code: string
  status: string
  items: Item[]
  photos: Photo[]
}

/** Estados de excepción. Lo recibido es el default y no se marca. */
const EXCEPTIONS = ["MISSING", "REJECTED"] as const

export default function ReceiveDonationPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const dict = useDict()
  const t = dict.dashboard.donations
  const router = useRouter()
  const { data: session } = useSession()
  const token = session?.accessToken ?? ""

  const [code, setCode] = useState("")
  const [donation, setDonation] = useState<Donation | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})
  const [extras, setExtras] = useState<{ key: string; free_text: string; quantity: string; unit: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { params.then((p) => setCode(p.code)) }, [params])

  useEffect(() => {
    if (!code || !token) return
    apiFetch<Donation>(`/v1/donations/${code}`, { token })
      .then(setDonation)
      .catch(() => setError(t.not_found))
  }, [code, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (itemId: string, estado: string) =>
    setResults((r) => {
      const next = { ...r }
      if (next[itemId] === estado) delete next[itemId]
      else next[itemId] = estado
      return next
    })

  // La URL es firmada y de vida corta: se pide al abrirla, no al pintar la lista.
  async function verFoto(photoId: string) {
    try {
      const res = await apiFetch<{ url: string }>(
        `/v1/donations/${donation!.code}/photos/${photoId}/url`, { token }
      )
      window.open(res.url, "_blank", "noopener,noreferrer")
    } catch {
      setError(dict.dashboard.common.error_unknown)
    }
  }

  async function confirm() {
    if (!donation) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/v1/donations/${donation.code}/receive`, {
        method: "POST",
        token,
        body: JSON.stringify({
          results,
          extras: extras
            .filter((e) => e.free_text.trim() && e.unit.trim())
            .map((e) => ({
              free_text: e.free_text.trim(),
              quantity: parseInt(e.quantity, 10) || 1,
              unit: e.unit.trim(),
            })),
        }),
      })
      // El doble check termina donde empieza el trabajo de siempre: el intake,
      // ya pre-llenado con lo que esta donación trajo.
      router.push(`/dashboard/intake/new?donation=${donation.code}`)
    } catch {
      setError(dict.dashboard.common.error_unknown)
      setSaving(false)
    }
  }

  if (error && !donation) {
    return <div className="max-w-2xl p-6 text-sm text-fnt">{error}</div>
  }
  if (!donation) {
    return <div className="max-w-2xl p-6 text-sm text-fnt">{dict.dashboard.common.loading}</div>
  }

  const recibida = donation.status === "RECEIVED"

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-mono text-xl font-bold text-tx">{donation.code}</h1>
        <p className="mt-1 text-sm text-mut">{recibida ? t.already_received : t.subtitle}</p>
      </div>

      <ul className="divide-y divide-line rounded-xl border border-cardB bg-card">
        {donation.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 p-3">
            <div>
              <p className="text-sm text-tx">{item.free_text}</p>
              <p className="text-xs text-fnt">
                {item.quantity} {item.unit}
                {item.added_by === "center" && ` · ${t.added_by_center}`}
              </p>
            </div>
            {!recibida && (
              <div className="flex gap-1">
                {EXCEPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => toggle(item.id, e)}
                    className={`rounded-lg px-2 py-1 text-xs ${
                      results[item.id] === e
                        ? "bg-[var(--dRejB)] text-[var(--dRejT)]"
                        : "bg-chip text-mut hover:bg-card2"
                    }`}
                  >
                    {t.status[e as keyof typeof t.status]}
                  </button>
                ))}
              </div>
            )}
            {recibida && item.reception_status && (
              <span className="text-xs text-mut">
                {t.status[item.reception_status as keyof typeof t.status]}
              </span>
            )}
          </li>
        ))}
      </ul>

      {(donation.photos?.length ?? 0) > 0 && (
        <div>
          <p className="text-xs font-semibold text-mut">{t.photos_title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {donation.photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => verFoto(p.id)}
                className="rounded-lg border border-cardB bg-card px-3 py-2 text-xs text-tx hover:bg-card2"
              >
                {t.photo_n.replace("{n}", String(i + 1))}
              </button>
            ))}
          </div>
        </div>
      )}

      {!recibida && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-mut">{t.extras_title}</p>
            {extras.map((e, i) => (
              <div key={e.key} className="grid grid-cols-12 gap-2">
                <input
                  className="col-span-6 rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx"
                  placeholder={t.extra_description}
                  value={e.free_text}
                  onChange={(ev) => setExtras((xs) => xs.map((x, j) => j === i ? { ...x, free_text: ev.target.value } : x))}
                />
                <input
                  className="col-span-2 rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx"
                  type="number" min={1} value={e.quantity}
                  onChange={(ev) => setExtras((xs) => xs.map((x, j) => j === i ? { ...x, quantity: ev.target.value } : x))}
                />
                <input
                  className="col-span-4 rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx"
                  placeholder={t.extra_unit} value={e.unit}
                  onChange={(ev) => setExtras((xs) => xs.map((x, j) => j === i ? { ...x, unit: ev.target.value } : x))}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setExtras((xs) => [...xs, { key: crypto.randomUUID(), free_text: "", quantity: "1", unit: "" }])}
              className="text-sm text-[var(--blue)] hover:underline"
            >
              {t.add_extra}
            </button>
          </div>

          {error && <p className="text-sm text-[var(--dRejT)]">{error}</p>}

          <button
            type="button"
            onClick={confirm}
            disabled={saving}
            className="rounded-xl bg-[var(--gold)] px-6 py-3 text-sm font-medium text-[#3B2A00] hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t.confirming : t.confirm}
          </button>
        </>
      )}
    </div>
  )
}
