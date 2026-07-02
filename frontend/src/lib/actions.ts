"use server"

import { signIn, signOut, auth } from "@/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { apiFetch } from "@/lib/api"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

function extractError(body: Record<string, unknown>, fallback = "Something went wrong"): string {
  // New error envelope: { error: { code, message, field } }
  const env = body.error as Record<string, unknown> | undefined
  if (env?.message && typeof env.message === "string") return env.message
  // Legacy / passthrough
  const detail = body.detail
  if (!detail) return fallback
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) return (detail[0] as Record<string, unknown>)?.msg as string ?? fallback
  return fallback
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginAction(_: unknown, formData: FormData) {
  const rawCallback = (formData.get("callbackUrl") as string | null) ?? ""
  const callbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard"

  try {
    await signIn("credentials", {
      identifier: formData.get("identifier") as string,
      password: formData.get("password") as string,
      redirectTo: callbackUrl,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const msg = (error.cause?.err as Error | undefined)?.message ?? ""
      if (msg.startsWith("TOTP_REQUIRED:")) {
        return { requires_totp: true, partial_token: msg.slice("TOTP_REQUIRED:".length) }
      }
      // Note: the frontend stores the partial_token in sessionStorage and redirects to /login/2fa
      if (msg === "EMAIL_NOT_VERIFIED") return { error: "email_not_verified" }
      if (msg === "ACCOUNT_DISABLED") return { error: "account_disabled" }
      return { error: "Invalid email or password" }
    }
    throw error
  }
}

export async function totpChallengeAction(partial_token: string, code: string) {
  const res = await fetch(`${API_URL}/v1/auth/totp/challenge`, {
    method: "POST",
    body: JSON.stringify({ partial_token, code }),
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: (data.error?.message as string | undefined) ?? "Código incorrecto." }
  }

  const data = await res.json()
  try {
    await signIn("credentials", { accessToken: data.access_token, redirectTo: "/dashboard" })
  } catch (error) {
    if (error instanceof AuthError) return { error: "Error al iniciar sesión. Intenta de nuevo." }
    throw error
  }
}

export async function registerAction(_: unknown, formData: FormData) {
  const body = {
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
    full_name: formData.get("full_name") || undefined,
  }

  const res = await fetch(`${API_URL}/v1/auth/register`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: extractError(data, "Registration failed") }
  }

  redirect(`/verify-email?email=${encodeURIComponent(body.email as string)}`)
}

export async function forgotPasswordAction(_: unknown, formData: FormData) {
  const email = formData.get("email") as string

  const res = await fetch(`${API_URL}/v1/auth/forgot-password`, {
    method: "POST",
    body: JSON.stringify({ email }),
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: extractError(data, "No pudimos procesar la solicitud.") }
  }

  // Always a generic success message — the backend intentionally doesn't
  // reveal whether the email is registered (enumeration protection).
  return { success: true }
}

export async function resetPasswordAction(_: unknown, formData: FormData) {
  const token = formData.get("token") as string
  const new_password = formData.get("new_password") as string
  const confirm_password = formData.get("confirm_password") as string

  if (new_password !== confirm_password) return { error: "Las contraseñas no coinciden" }
  if (new_password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" }

  const res = await fetch(`${API_URL}/v1/auth/reset-password`, {
    method: "POST",
    body: JSON.stringify({ token, new_password }),
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: extractError(data, "El enlace es inválido o expiró.") }
  }

  return { success: true }
}

export async function logoutAction() {
  const session = await auth()
  if (session?.accessToken) {
    await fetch(`${API_URL}/v1/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }).catch(() => {})
  }
  await signOut({ redirectTo: "/login" })
}

export async function revalidateDashboardAction(): Promise<void> {
  revalidatePath("/dashboard", "layout")
}

export async function changePasswordAction(_: unknown, formData: FormData) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  const current_password = formData.get("current_password") as string
  const new_password = formData.get("new_password") as string
  const confirm_password = formData.get("confirm_password") as string

  if (new_password !== confirm_password) return { error: "Las contraseñas no coinciden" }
  if (new_password.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres" }

  const res = await fetch(`${API_URL}/v1/auth/me/password`, {
    method: "PATCH",
    body: JSON.stringify({ current_password, new_password }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: extractError(data, "Error al cambiar contraseña") }
  }

  const data = await res.json()
  try {
    await signIn("credentials", { accessToken: data.access_token, redirectTo: "/dashboard" })
  } catch (error) {
    if (error instanceof AuthError) return { error: "Error al actualizar sesión" }
    throw error
  }
}

export async function updateProfileAction(_: unknown, formData: FormData) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  const full_name = (formData.get("full_name") as string | null)?.trim() ?? ""
  if (!full_name) return { error: "El nombre no puede estar vacío" }

  const res = await fetch(`${API_URL}/v1/auth/me`, {
    method: "PATCH",
    body: JSON.stringify({ full_name }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: extractError(data, "Error al actualizar el perfil") }
  }

  revalidatePath("/dashboard", "layout")
  return { success: true }
}

export async function uploadAvatarAction(_: unknown, formData: FormData) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) return { error: "Selecciona una imagen" }

  const uploadForm = new FormData()
  uploadForm.append("file", file)

  const res = await fetch(`${API_URL}/v1/auth/me/avatar`, {
    method: "POST",
    body: uploadForm,
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: extractError(data, "Error al subir la imagen") }
  }

  const data = await res.json()
  revalidatePath("/dashboard", "layout")
  return { success: true, avatar_url: data.avatar_url as string | null }
}

// ── Intake ────────────────────────────────────────────────────────────────────

export interface BoxDraft {
  product_type_id: string
  quantity: number
  unit: string
  batch?: string
  expiry_date?: string
  weight_kg?: number
}

export interface CreateIntakePayload {
  campaign_id?: string
  donante_libre?: string
  notes?: string
  boxes: BoxDraft[]
}

export async function createIntakeAction(payload: CreateIntakePayload) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch("/v1/intakes", {
      method: "POST",
      body: JSON.stringify(payload),
      token: session.accessToken,
    })
    revalidatePath("/dashboard/intake")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al registrar intake" }
  }
}
