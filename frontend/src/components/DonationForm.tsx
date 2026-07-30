"use client"

import { useEffect, useState } from "react"
import Turnstile from "react-turnstile"

import { resendDonationConfirmation, submitDonation } from "@/lib/donation-actions"

export interface DonationFormLabels {
  firstName: string
  lastName: string
  email: string
  phone: string
  phoneHint: string
  center: string
  centerHint: string
  centerNone: string
  campaign: string
  campaignHint: string
  campaignNone: string
  itemsTitle: string
  itemsHint: string
  itemDescription: string
  itemQuantity: string
  itemUnit: string
  addItem: string
  removeItem: string
  notes: string
  termsLabel: string
  termsError: string
  submit: string
  submitting: string
  successTitle: string
  successBody: string
  resendPrompt: string
  resend: string
  resending: string
  resendDone: string
  turnstileError: string
  requiredError: string
}

interface Option {
  id: string
  name: string
}

interface Row {
  key: string
  free_text: string
  quantity: string
  unit: string
}

const emptyRow = (): Row => ({
  key: crypto.randomUUID(),
  free_text: "",
  quantity: "1",
  unit: "",
})

export default function DonationForm({
  labels: t,
  locale,
  sitekey,
}: {
  labels: DonationFormLabels
  locale: "es" | "en"
  sitekey: string
}) {
  const [centers, setCenters] = useState<Option[]>([])
  const [campaigns, setCampaigns] = useState<Option[]>([])
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    intended_center_id: "", intended_campaign_id: "", notes: "",
  })
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [terms, setTerms] = useState(false)
  const [token, setToken] = useState("")
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  // El token de Turnstile es de un solo uso: el reenvío necesita el suyo.
  const [resendToken, setResendToken] = useState("")
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  // Catálogos públicos: sin datos de contacto de los centros ni campañas internas.
  useEffect(() => {
    fetch("/api/public/centers").then((r) => (r.ok ? r.json() : [])).then(setCenters).catch(() => {})
    fetch("/api/public/campaigns").then((r) => (r.ok ? r.json() : [])).then(setCampaigns).catch(() => {})
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const setRow = (key: string, field: keyof Row, value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const items = rows
      .filter((r) => r.free_text.trim() && r.unit.trim())
      .map((r) => ({
        free_text: r.free_text.trim(),
        quantity: parseInt(r.quantity, 10) || 1,
        unit: r.unit.trim(),
      }))

    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || items.length === 0) {
      setError(t.requiredError)
      return
    }
    if (!terms) {
      setError(t.termsError)
      return
    }
    if (!token) {
      setError(t.turnstileError)
      return
    }

    setSending(true)
    const result = await submitDonation({
      locale,
      turnstileToken: token,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone || undefined,
      intended_center_id: form.intended_center_id || undefined,
      intended_campaign_id: form.intended_campaign_id || undefined,
      items,
      notes: form.notes || undefined,
      terms_accepted: true,
    })
    setSending(false)

    if (result.ok) {
      setDone(true)
    } else {
      setError(result.error)
      setToken("")
      setTurnstileKey((k) => k + 1)   // un token de Turnstile es de un solo uso
    }
  }

  async function handleResend() {
    setResending(true)
    setError(null)
    const result = await resendDonationConfirmation({
      locale, turnstileToken: resendToken, email: form.email,
    })
    setResending(false)
    if (result.ok) {
      setResent(true)
    } else {
      setError(result.error)
      setResendToken("")
      setTurnstileKey((k) => k + 1)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-lg font-semibold text-zinc-900">{t.successTitle}</p>
        <p className="mt-2 text-sm text-zinc-600">{t.successBody}</p>

        {/* El correo se pierde: sin esta salida, quien no lo recibe se queda
            sin donación cuando la purga vence su registro. */}
        <div className="mt-6 border-t border-zinc-100 pt-6">
          {resent ? (
            <p className="text-sm text-zinc-600">{t.resendDone}</p>
          ) : (
            <>
              <p className="text-xs text-zinc-500">{t.resendPrompt}</p>
              {sitekey && (
                <div className="mt-3 flex justify-center">
                  <Turnstile key={turnstileKey} sitekey={sitekey} onVerify={setResendToken} theme="light" />
                </div>
              )}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || !resendToken}
                className="mt-3 text-sm text-amber-700 hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resending ? t.resending : t.resend}
              </button>
              {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            </>
          )}
        </div>
      </div>
    )
  }

  const input =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
  const label = "block text-xs font-medium text-zinc-600 mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{t.firstName} *</label>
          <input className={input} value={form.first_name} onChange={set("first_name")} required />
        </div>
        <div>
          <label className={label}>{t.lastName} *</label>
          <input className={input} value={form.last_name} onChange={set("last_name")} required />
        </div>
        <div>
          <label className={label}>{t.email} *</label>
          <input className={input} type="email" value={form.email} onChange={set("email")} required />
        </div>
        <div>
          <label className={label}>{t.phone}</label>
          <input className={input} type="tel" value={form.phone} onChange={set("phone")} />
          <p className="mt-1 text-xs text-zinc-500">{t.phoneHint}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{t.center}</label>
          <select className={input} value={form.intended_center_id} onChange={set("intended_center_id")}>
            <option value="">{t.centerNone}</option>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">{t.centerHint}</p>
        </div>
        <div>
          <label className={label}>{t.campaign}</label>
          <select className={input} value={form.intended_campaign_id} onChange={set("intended_campaign_id")}>
            <option value="">{t.campaignNone}</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">{t.campaignHint}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-zinc-900">{t.itemsTitle}</p>
        <p className="mb-3 text-xs text-zinc-500">{t.itemsHint}</p>

        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-12 gap-2">
              <div className="col-span-12 sm:col-span-6">
                <input
                  className={input}
                  placeholder={t.itemDescription}
                  value={r.free_text}
                  onChange={(e) => setRow(r.key, "free_text", e.target.value)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input
                  className={input}
                  type="number"
                  min={1}
                  placeholder={t.itemQuantity}
                  value={r.quantity}
                  onChange={(e) => setRow(r.key, "quantity", e.target.value)}
                />
              </div>
              <div className="col-span-5 sm:col-span-3">
                <input
                  className={input}
                  placeholder={t.itemUnit}
                  value={r.unit}
                  onChange={(e) => setRow(r.key, "unit", e.target.value)}
                />
              </div>
              <div className="col-span-3 sm:col-span-1 flex items-center">
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    className="text-xs text-zinc-400 hover:text-zinc-700"
                    aria-label={t.removeItem}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, emptyRow()])}
          className="mt-3 text-sm text-amber-700 hover:underline"
        >
          {t.addItem}
        </button>
      </div>

      <div>
        <label className={label}>{t.notes}</label>
        <textarea className={input} rows={2} value={form.notes} onChange={set("notes")} />
      </div>

      {/* Fase 20: la donación es una transferencia irrevocable. Se acepta antes
          de registrar, y queda guardado qué versión se aceptó. */}
      <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        {/* Sin enlace al documento completo todavía: los Términos de Donación
            no se publican hasta que un abogado los revise (Fase 20, task 7).
            Mientras tanto, lo que se acepta es exactamente lo que dice aquí. */}
        <span>{t.termsLabel}</span>
      </label>

      {sitekey && (
        <Turnstile key={turnstileKey} sitekey={sitekey} onVerify={setToken} theme="light" />
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={sending}
        className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-amber-950 hover:opacity-90 disabled:opacity-50"
      >
        {sending ? t.submitting : t.submit}
      </button>
    </form>
  )
}
