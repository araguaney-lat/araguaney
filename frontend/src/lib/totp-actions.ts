"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"

export interface TOTPSetupData {
  qr_uri: string
  secret: string
}

export interface TOTPConfirmData {
  backup_codes: string[]
}

export async function setupTotpAction(): Promise<{ data: TOTPSetupData } | { error: string }> {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch<TOTPSetupData>("/v1/auth/totp/setup", {
      method: "POST",
      token: session.accessToken,
    })
    return { data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al configurar 2FA" }
  }
}

export async function confirmTotpAction(code: string): Promise<{ data: TOTPConfirmData } | { error: string }> {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch<TOTPConfirmData>("/v1/auth/totp/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
      token: session.accessToken,
    })
    return { data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Código incorrecto" }
  }
}

export async function disableTotpAction(code: string): Promise<{ ok: true } | { error: string }> {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    await apiFetch("/v1/auth/totp/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
      token: session.accessToken,
    })
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Código incorrecto" }
  }
}
