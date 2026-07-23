"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { apiFetch, ApiError } from "@/lib/api"
import { verifyTurnstile } from "@/lib/turnstile"
import type { Locale } from "@/lib/routes"

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CenterApplication {
  id: string
  center_name: string
  country_code: string
  state_name: string | null
  address: string | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
  backing_org: string | null
  social_url: string | null
  message: string | null
  status: string
  email_verified_at: string | null
  reviewed_at: string | null
  reject_reason: string | null
  created_center_id: string | null
  created_at: string
}

const QUEUE_PATH = "/dashboard/admin/center-applications"

// ── Public submission ──────────────────────────────────────────────────────────

const submitSchema = z.object({
  center_name: z.string().trim().min(2).max(150),
  country_code: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{2}$/)),
  state_name: z.string().trim().max(120).optional(),
  address: z.string().trim().max(300).optional(),
  contact_name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email().max(200),
  contact_phone: z.string().trim().max(40).optional(),
  backing_org: z.string().trim().max(150).optional(),
  social_url: z.string().trim().url().startsWith("https://").max(300).optional(),
  message: z.string().trim().max(2000).optional(),
  turnstileToken: z.string().min(1),
  locale: z.enum(["es", "en"]),
})

export type SubmitCenterApplicationInput = z.input<typeof submitSchema>
export type SubmitResult = { ok: true } | { ok: false; error: string }

const MESSAGES: Record<string, Record<Locale, string>> = {
  ALREADY_REGISTERED: {
    es: "Este correo ya tiene una cuenta. Inicia sesión.",
    en: "This email already has an account. Please sign in.",
  },
  DUPLICATE_APPLICATION: {
    es: "Ya existe una solicitud abierta para este correo o centro.",
    en: "There is already an open application for this email or center.",
  },
  INVALID: {
    es: "Datos inválidos. Revisa el formulario.",
    en: "Invalid data. Please review the form.",
  },
  TURNSTILE: {
    es: "Verificación de seguridad fallida. Intenta de nuevo.",
    en: "Security check failed. Please try again.",
  },
  GENERIC: {
    es: "No se pudo enviar la solicitud. Intenta más tarde.",
    en: "We couldn't submit the application. Please try again later.",
  },
}

function localeOf(input: unknown): Locale {
  if (
    typeof input === "object" &&
    input !== null &&
    "locale" in input &&
    (input as { locale?: unknown }).locale === "en"
  ) {
    return "en"
  }
  return "es"
}

// Drop empty-string / undefined optionals so the backend receives a clean body.
function omitEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""),
  ) as Partial<T>
}

export async function submitCenterApplication(input: unknown): Promise<SubmitResult> {
  const parsed = submitSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: MESSAGES.INVALID[localeOf(input)] }
  }

  const { turnstileToken, locale, ...fields } = parsed.data

  const valid = await verifyTurnstile(turnstileToken)
  if (!valid) {
    return { ok: false, error: MESSAGES.TURNSTILE[locale] }
  }

  const body = omitEmpty({
    center_name: fields.center_name,
    country_code: fields.country_code,
    state_name: fields.state_name,
    address: fields.address,
    contact_name: fields.contact_name,
    contact_email: fields.contact_email,
    contact_phone: fields.contact_phone,
    backing_org: fields.backing_org,
    social_url: fields.social_url,
    message: fields.message,
  })

  try {
    await apiFetch<{ id: string; status: string }>("/v1/public/center-applications", {
      method: "POST",
      body: JSON.stringify(body),
    })
    return { ok: true }
  } catch (err) {
    if (err instanceof ApiError && err.code && MESSAGES[err.code]) {
      return { ok: false, error: MESSAGES[err.code][locale] }
    }
    return { ok: false, error: MESSAGES.GENERIC[locale] }
  }
}

// ── Public email confirmation ───────────────────────────────────────────────────

export type ConfirmResult =
  | { ok: true; status: string }
  | { ok: false; code: "INVALID_TOKEN" | "GENERIC" }

export async function confirmCenterApplication(token: string): Promise<ConfirmResult> {
  const clean = token?.trim()
  if (!clean) return { ok: false, code: "INVALID_TOKEN" }

  try {
    const res = await apiFetch<{ id: string; status: string }>(
      "/v1/public/center-applications/confirm",
      { method: "POST", body: JSON.stringify({ token: clean }) },
    )
    return { ok: true, status: res.status }
  } catch (err) {
    if (err instanceof ApiError && err.code === "INVALID_TOKEN") {
      return { ok: false, code: "INVALID_TOKEN" }
    }
    return { ok: false, code: "GENERIC" }
  }
}

// ── Authenticated review queue (national_admin / superadmin) ─────────────────────

export async function listCenterApplications(): Promise<CenterApplication[]> {
  const session = await auth()
  if (!session?.accessToken) return []
  return apiFetch<CenterApplication[]>("/v1/center-applications", {
    token: session.accessToken,
  })
}

export async function approveCenterApplication(id: string): Promise<CenterApplication> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("No autenticado")
  const app = await apiFetch<CenterApplication>(`/v1/center-applications/${id}/approve`, {
    method: "POST",
    token: session.accessToken,
  })
  revalidatePath(QUEUE_PATH)
  return app
}

export async function rejectCenterApplication(
  id: string,
  reason: string,
): Promise<CenterApplication> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("No autenticado")
  const app = await apiFetch<CenterApplication>(`/v1/center-applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason: reason.trim() }),
    token: session.accessToken,
  })
  revalidatePath(QUEUE_PATH)
  return app
}
