"use client"

import { useState } from "react"
import Image from "next/image"
import { setupTotpAction, confirmTotpAction, disableTotpAction } from "@/lib/totp-actions"
import type { TOTPSetupData, TOTPConfirmData } from "@/lib/totp-actions"
import { useDict } from "@/context/DictionaryContext"

type Step = "idle" | "setup" | "backup" | "disable"

interface Props {
  initialEnabled: boolean
}

export default function TOTPSettings({ initialEnabled }: Props) {
  const dict = useDict()
  const t = dict.dashboard.settings

  const [enabled, setEnabled] = useState(initialEnabled)
  const [step, setStep] = useState<Step>("idle")
  const [setupData, setSetupData] = useState<TOTPSetupData | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleStartSetup() {
    setLoading(true)
    setError("")
    const result = await setupTotpAction()
    setLoading(false)
    if ("error" in result) { setError(result.error); return }
    setSetupData(result.data)
    setStep("setup")
  }

  async function handleConfirm() {
    if (code.length !== 6) { setError(t.totp_code_error); return }
    setLoading(true)
    setError("")
    const result = await confirmTotpAction(code)
    setLoading(false)
    if ("error" in result) { setError(result.error); return }
    setBackupCodes((result.data as TOTPConfirmData).backup_codes)
    setEnabled(true)
    setStep("backup")
    setCode("")
  }

  async function handleDisable() {
    if (!code) { setError(t.totp_disable_error); return }
    setLoading(true)
    setError("")
    const result = await disableTotpAction(code)
    setLoading(false)
    if ("error" in result) { setError(result.error); return }
    setEnabled(false)
    setStep("idle")
    setCode("")
  }

  if (step === "backup") {
    return (
      <div className="rounded-xl bg-dSealB p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-dSealT text-lg">✓</span>
          <p className="text-sm font-semibold text-dSealT">{t.totp_backup_title}</p>
        </div>
        <p className="text-xs text-dSealT">{t.totp_backup_notice}</p>
        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((c) => (
            <code key={c} className="block bg-card border border-cardB rounded px-3 py-1.5 text-xs font-mono text-tx text-center">
              {c}
            </code>
          ))}
        </div>
        <button
          onClick={() => setStep("idle")}
          className="w-full rounded-lg bg-[var(--dSealT)] text-white text-sm font-semibold py-2.5 hover:opacity-90 transition-colors"
        >
          {t.totp_saved_codes}
        </button>
      </div>
    )
  }

  if (step === "setup" && setupData) {
    return (
      <div className="rounded-xl border border-cardB bg-card p-5 space-y-5">
        <div>
          <p className="text-sm font-semibold text-tx mb-1">{t.totp_scan_title}</p>
          <p className="text-xs text-mut">{t.totp_scan_subtitle}</p>
        </div>

        <div className="flex justify-center">
          <Image
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupData.qr_uri)}`}
            alt={t.totp_qr_alt}
            width={180}
            height={180}
            className="rounded border border-cardB"
            unoptimized
          />
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer text-mut hover:text-tx">{t.totp_manual_entry}</summary>
          <code className="block mt-2 bg-chip rounded px-3 py-2 font-mono text-tx break-all">
            {setupData.secret}
          </code>
        </details>

        <div>
          <label className="block text-xs font-semibold text-mut mb-1.5">{t.totp_code_label}</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError("") }}
            placeholder={t.totp_code_placeholder}
            className="w-full border border-inpB bg-inp text-tx rounded-lg px-4 py-2.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          />
          {error && <p className="text-xs text-[var(--dRejT)] mt-1">{error}</p>}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setStep("idle"); setCode(""); setError("") }}
            className="flex-1 rounded-lg border border-cardB text-mut text-sm font-semibold py-2.5 hover:bg-card2 transition-colors"
          >
            {t.totp_cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || code.length !== 6}
            className="flex-1 rounded-lg bg-[var(--gold)] text-[#3B2A00] text-sm font-semibold py-2.5 hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {loading ? t.totp_activating : t.totp_activate_btn}
          </button>
        </div>
      </div>
    )
  }

  if (step === "disable") {
    return (
      <div className="rounded-xl border border-cardB bg-card p-5 space-y-4">
        <p className="text-sm font-semibold text-tx">{t.totp_disable_title}</p>
        <p className="text-xs text-mut">{t.totp_disable_subtitle}</p>
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError("") }}
          placeholder={t.totp_disable_placeholder}
          className="w-full border border-inpB bg-inp text-tx rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--dRejT)]"
        />
        {error && <p className="text-xs text-[var(--dRejT)]">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => { setStep("idle"); setCode(""); setError("") }}
            className="flex-1 rounded-lg border border-cardB text-mut text-sm font-semibold py-2.5 hover:bg-card2 transition-colors"
          >
            {t.totp_cancel}
          </button>
          <button
            onClick={handleDisable}
            disabled={loading}
            className="flex-1 rounded-lg bg-[var(--dRejT)] text-white text-sm font-semibold py-2.5 hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {loading ? t.totp_deactivating : t.totp_deactivate_btn}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-cardB bg-card p-5 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-tx">
          2FA {enabled
            ? <span className="text-dSealT">{t.totp_status_enabled_badge}</span>
            : <span className="text-fnt">{t.totp_status_disabled_badge}</span>}
        </p>
        <p className="text-xs text-mut mt-0.5">
          {enabled ? t.totp_status_enabled_desc : t.totp_status_disabled_desc}
        </p>
      </div>
      {enabled ? (
        <button
          onClick={() => setStep("disable")}
          className="rounded-lg border border-[var(--dRejT)] text-dRejT text-xs font-semibold px-4 py-2 hover:bg-dRejB transition-colors"
        >
          {t.totp_btn_deactivate}
        </button>
      ) : (
        <button
          onClick={handleStartSetup}
          disabled={loading}
          className="rounded-lg bg-[var(--gold)] text-[#3B2A00] text-xs font-semibold px-4 py-2 hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {loading ? "…" : t.totp_btn_activate}
        </button>
      )}
    </div>
  )
}
