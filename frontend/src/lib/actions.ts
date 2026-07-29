"use server"

import { signIn, signOut, auth } from "@/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { apiFetch } from "@/lib/api"
import { CURRENT_TERMS_VERSION } from "@/lib/legal"
import { getLocale, getDictionary } from "@/lib/i18n"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

async function authDict() {
  const locale = await getLocale()
  return (await getDictionary(locale)).auth
}

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
  const t = await authDict()
  const res = await fetch(`${API_URL}/v1/auth/totp/challenge`, {
    method: "POST",
    body: JSON.stringify({ partial_token, code }),
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: (data.error?.message as string | undefined) ?? t.errors.totp_code_incorrect }
  }

  const data = await res.json()
  try {
    await signIn("credentials", { accessToken: data.access_token, redirectTo: "/dashboard" })
  } catch (error) {
    if (error instanceof AuthError) return { error: t.errors.login_session_error }
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
  const t = await authDict()
  const email = formData.get("email") as string

  const res = await fetch(`${API_URL}/v1/auth/forgot-password`, {
    method: "POST",
    body: JSON.stringify({ email }),
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: extractError(data, t.errors.forgot_password_failed) }
  }

  // Always a generic success message — the backend intentionally doesn't
  // reveal whether the email is registered (enumeration protection).
  return { success: true }
}

export async function resetPasswordAction(_: unknown, formData: FormData) {
  const t = await authDict()
  const token = formData.get("token") as string
  const new_password = formData.get("new_password") as string
  const confirm_password = formData.get("confirm_password") as string

  if (new_password !== confirm_password) return { error: t.errors.passwords_dont_match }
  if (new_password.length < 8) return { error: t.errors.password_too_short_8 }

  const res = await fetch(`${API_URL}/v1/auth/reset-password`, {
    method: "POST",
    body: JSON.stringify({ token, new_password }),
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: extractError(data, t.errors.reset_link_invalid) }
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

export async function deleteAccountAction(_: unknown, formData: FormData) {
  const t = await authDict()
  const session = await auth()
  if (!session?.accessToken) return { error: t.errors.not_authenticated }

  const password = formData.get("password") as string
  if (!password) return { error: t.errors.password_required }

  const res = await fetch(`${API_URL}/v1/auth/me`, {
    method: "DELETE",
    body: JSON.stringify({ password }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: extractError(data, t.errors.delete_account_failed) }
  }

  // The account is gone: drop the session and land on the login screen.
  await signOut({ redirectTo: "/login?deleted=1" })
  return null
}


export async function changePasswordAction(_: unknown, formData: FormData) {
  const t = await authDict()
  const session = await auth()
  if (!session?.accessToken) return { error: t.errors.not_authenticated }

  const current_password = formData.get("current_password") as string
  const new_password = formData.get("new_password") as string
  const confirm_password = formData.get("confirm_password") as string

  if (new_password !== confirm_password) return { error: t.errors.passwords_dont_match }
  if (new_password.length < 8) return { error: t.errors.password_too_short_8 }

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
    return { error: extractError(data, t.errors.change_password_failed) }
  }

  const data = await res.json()
  try {
    await signIn("credentials", { accessToken: data.access_token, redirectTo: "/dashboard" })
  } catch (error) {
    if (error instanceof AuthError) return { error: t.errors.session_update_failed }
    throw error
  }
}

export async function acceptTermsAction(_: unknown, formData: FormData) {
  const t = await authDict()
  const session = await auth()
  if (!session?.accessToken) return { error: t.errors.not_authenticated }

  if (!formData.get("accepted_terms")) {
    return { error: t.errors.must_accept_terms }
  }

  const res = await fetch(`${API_URL}/v1/auth/me/accept-terms`, {
    method: "POST",
    body: JSON.stringify({ version: CURRENT_TERMS_VERSION }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: extractError(data, t.errors.accept_terms_failed) }
  }

  // Force NextAuth to rebuild the session from a fresh /me — otherwise the
  // JWT cookie keeps must_accept_terms=true and the dashboard/studio layout
  // gate would redirect back here in an infinite loop.
  try {
    await signIn("credentials", { accessToken: session.accessToken, redirectTo: "/dashboard" })
  } catch (error) {
    if (error instanceof AuthError) return { error: t.errors.accept_terms_session_failed }
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
  gtin?: string
}

export interface CreateIntakePayload {
  campaign_id?: string
  donante_libre?: string
  notes?: string
  boxes: BoxDraft[]
  center_id?: string
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
