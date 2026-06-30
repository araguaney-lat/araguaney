"use client"

import { useState } from "react"
import Image from "next/image"
import { setupTotpAction, confirmTotpAction, disableTotpAction } from "@/lib/totp-actions"
import type { TOTPSetupData, TOTPConfirmData } from "@/lib/totp-actions"

type Step = "idle" | "setup" | "backup" | "disable"

interface Props {
  initialEnabled: boolean
}

export default function TOTPSettings({ initialEnabled }: Props) {
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
    if (code.length !== 6) { setError("Ingresa el código de 6 dígitos"); return }
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
    if (!code) { setError("Ingresa tu código de verificación"); return }
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
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-lg">✓</span>
          <p className="text-sm font-semibold text-green-800">2FA activado correctamente</p>
        </div>
        <p className="text-xs text-green-700">
          Guarda estos códigos de respaldo en un lugar seguro. Solo se muestran una vez y sirven si pierdes acceso a tu app autenticadora.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((c) => (
            <code key={c} className="block bg-white border border-green-200 rounded px-3 py-1.5 text-xs font-mono text-zinc-800 text-center">
              {c}
            </code>
          ))}
        </div>
        <button
          onClick={() => setStep("idle")}
          className="w-full rounded-lg bg-green-600 text-white text-sm font-semibold py-2.5 hover:bg-green-700 transition-colors"
        >
          He guardado mis códigos
        </button>
      </div>
    )
  }

  if (step === "setup" && setupData) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-5">
        <div>
          <p className="text-sm font-semibold text-zinc-800 mb-1">Escanea el código QR</p>
          <p className="text-xs text-zinc-500">Usa Google Authenticator, Authy u otra app compatible.</p>
        </div>

        <div className="flex justify-center">
          <Image
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupData.qr_uri)}`}
            alt="QR código TOTP"
            width={180}
            height={180}
            className="rounded border border-zinc-200"
            unoptimized
          />
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer text-zinc-500 hover:text-zinc-700">¿No puedes escanear? Ingresa el código manualmente</summary>
          <code className="block mt-2 bg-zinc-100 rounded px-3 py-2 font-mono text-zinc-800 break-all">
            {setupData.secret}
          </code>
        </details>

        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
            Ingresa el código de 6 dígitos de tu app
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError("") }}
            placeholder="000000"
            className="w-full border border-zinc-200 rounded-lg px-4 py-2.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setStep("idle"); setCode(""); setError("") }}
            className="flex-1 rounded-lg border border-zinc-200 text-zinc-700 text-sm font-semibold py-2.5 hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || code.length !== 6}
            className="flex-1 rounded-lg bg-blue-600 text-white text-sm font-semibold py-2.5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Verificando…" : "Activar 2FA"}
          </button>
        </div>
      </div>
    )
  }

  if (step === "disable") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <p className="text-sm font-semibold text-zinc-800">Desactivar 2FA</p>
        <p className="text-xs text-zinc-500">Ingresa el código de tu app autenticadora o un código de respaldo.</p>
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError("") }}
          placeholder="Código de 6 dígitos o código de respaldo"
          className="w-full border border-zinc-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => { setStep("idle"); setCode(""); setError("") }}
            className="flex-1 rounded-lg border border-zinc-200 text-zinc-700 text-sm font-semibold py-2.5 hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDisable}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-600 text-white text-sm font-semibold py-2.5 hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Desactivando…" : "Desactivar"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-zinc-800">
          2FA {enabled ? <span className="text-green-600">Activado</span> : <span className="text-zinc-400">Desactivado</span>}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {enabled
            ? "Tu cuenta está protegida con autenticación en dos pasos."
            : "Activa 2FA para mayor seguridad en tu cuenta."}
        </p>
      </div>
      {enabled ? (
        <button
          onClick={() => setStep("disable")}
          className="rounded-lg border border-red-200 text-red-600 text-xs font-semibold px-4 py-2 hover:bg-red-50 transition-colors"
        >
          Desactivar
        </button>
      ) : (
        <button
          onClick={handleStartSetup}
          disabled={loading}
          className="rounded-lg bg-blue-600 text-white text-xs font-semibold px-4 py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "…" : "Activar"}
        </button>
      )}
    </div>
  )
}
