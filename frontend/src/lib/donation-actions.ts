"use server"

import { z } from "zod"

import { apiFetch, ApiError } from "@/lib/api"
import { verifyTurnstile } from "@/lib/turnstile"

/** Resultado uniforme: la página nunca ve el error crudo del backend.

El alta no devuelve el código de la donación. Ese código viaja por correo, para
que quien pruebe una dirección ajena no obtenga nada del formulario. */
export type DonationResult =
  | { ok: true }
  | { ok: false; error: string }

/** La confirmación sí devuelve el código: llegó por correo y quien la ejecuta
ya demostró ser dueño de la dirección. */
export type DonationConfirmResult =
  | { ok: true; code: string }
  | { ok: false; error: string }

const MESSAGES: Record<string, Record<string, string>> = {
  INVALID: {
    es: "Revisa los datos del formulario.",
    en: "Please check the form fields.",
  },
  TURNSTILE: {
    es: "No pudimos verificar que eres una persona. Recarga la página e inténtalo de nuevo.",
    en: "We could not verify you are human. Reload the page and try again.",
  },
  GENERIC: {
    es: "No pudimos registrar tu donación. Inténtalo de nuevo en unos minutos.",
    en: "We could not register your donation. Please try again in a few minutes.",
  },
  RESEND_GENERIC: {
    es: "No pudimos reenviar el correo. Inténtalo de nuevo en unos minutos.",
    en: "We could not resend the email. Please try again in a few minutes.",
  },
}

const itemSchema = z
  .object({
    product_type_id: z.string().uuid().optional(),
    free_text: z.string().trim().min(1).max(200).optional(),
    quantity: z.number().int().positive().max(100_000),
    unit: z.string().trim().min(1).max(40),
  })
  // Espeja la regla del backend: del catálogo o texto libre, nunca ambos.
  .refine((i) => Boolean(i.product_type_id) !== Boolean(i.free_text), {
    message: "Cada renglón lleva un producto o una descripción, no ambos",
  })

const resendSchema = z.object({
  locale: z.enum(["es", "en"]).default("es"),
  turnstileToken: z.string().min(1),
  email: z.string().trim().email(),
})

const submitSchema = z.object({
  locale: z.enum(["es", "en"]).default("es"),
  turnstileToken: z.string().min(1),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  intended_center_id: z.string().uuid().optional(),
  intended_campaign_id: z.string().uuid().optional(),
  items: z.array(itemSchema).min(1).max(50),
  notes: z.string().trim().max(500).optional(),
})

function localeOf(input: unknown): string {
  const l = (input as { locale?: string })?.locale
  return l === "en" ? "en" : "es"
}

export async function submitDonation(input: unknown): Promise<DonationResult> {
  const parsed = submitSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: MESSAGES.INVALID[localeOf(input)] }
  }

  const { turnstileToken, locale, ...fields } = parsed.data

  // Turnstile se verifica aquí, antes de tocar el backend: el endpoint público
  // tiene su propio límite de tasa, pero el filtro barato va primero.
  if (!(await verifyTurnstile(turnstileToken))) {
    return { ok: false, error: MESSAGES.TURNSTILE[locale] }
  }

  try {
    await apiFetch("/v1/public/donations", {
      method: "POST",
      body: JSON.stringify({
        donor: {
          donor_type: "fisica",
          first_name: fields.first_name,
          last_name: fields.last_name,
          email: fields.email,
          phone: fields.phone || undefined,
        },
        intended_center_id: fields.intended_center_id,
        intended_campaign_id: fields.intended_campaign_id,
        items: fields.items,
        notes: fields.notes || undefined,
      }),
    })
    return { ok: true }
  } catch (err) {
    const code = err instanceof ApiError ? err.code : null
    const msg = (code && MESSAGES[code]?.[locale]) || MESSAGES.GENERIC[locale]
    return { ok: false, error: msg }
  }
}

export async function confirmDonation(token: string, locale = "es"): Promise<DonationConfirmResult> {
  try {
    const res = await apiFetch<{ code: string }>("/v1/public/donations/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
    return { ok: true, code: res.code }
  } catch {
    return {
      ok: false,
      error:
        locale === "en"
          ? "This link is invalid or has already been used."
          : "Este enlace es inválido o ya fue utilizado.",
    }
  }
}


/** Reenvía el correo de confirmación rotando el token del enlace anterior.

Devuelve `ok` exista o no una donación con ese correo: el backend responde igual
por la misma razón, y contradecirlo aquí volvería al formulario un verificador
de direcciones. */
export async function resendDonationConfirmation(input: unknown): Promise<DonationResult> {
  const parsed = resendSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: MESSAGES.INVALID[localeOf(input)] }
  }

  const { turnstileToken, locale, email } = parsed.data

  if (!(await verifyTurnstile(turnstileToken))) {
    return { ok: false, error: MESSAGES.TURNSTILE[locale] }
  }

  try {
    await apiFetch("/v1/public/donations/resend", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
    return { ok: true }
  } catch {
    return { ok: false, error: MESSAGES.RESEND_GENERIC[locale] }
  }
}

// ── Gestión por la persona donante (enlace del correo, sin sesión) ───────────

export interface ManagedItem {
  id?: string
  free_text: string | null
  quantity: number
  unit: string
}

export interface ManagedPhoto {
  id: string
  content_type: string
  size_bytes: number
  created_at: string
}

export interface ManagedDonation {
  code: string
  status: string
  notes: string | null
  items: ManagedItem[]
  photos: ManagedPhoto[]
}

/** El token viaja en la URL del correo; el backend lo compara contra su hash. */
export async function getManagedDonation(token: string): Promise<ManagedDonation | null> {
  try {
    return await apiFetch<ManagedDonation>(`/v1/public/donations/manage/${encodeURIComponent(token)}`)
  } catch {
    return null
  }
}

export async function updateManagedItems(
  token: string,
  items: { free_text: string; quantity: number; unit: string }[],
  locale: "es" | "en" = "es",
): Promise<DonationResult> {
  const parsed = z.array(itemSchema).min(1).max(50).safeParse(items)
  if (!parsed.success) return { ok: false, error: MESSAGES.INVALID[locale] }

  try {
    await apiFetch(`/v1/public/donations/manage/${encodeURIComponent(token)}/items`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    })
    return { ok: true }
  } catch {
    return { ok: false, error: MESSAGES.GENERIC[locale] }
  }
}

export async function cancelManagedDonation(
  token: string,
  locale: "es" | "en" = "es",
): Promise<DonationResult> {
  try {
    await apiFetch(`/v1/public/donations/manage/${encodeURIComponent(token)}/cancel`, {
      method: "POST",
    })
    return { ok: true }
  } catch {
    return { ok: false, error: MESSAGES.GENERIC[locale] }
  }
}

// ── Fotos ────────────────────────────────────────────────────────────────────

/** La llave la arma el backend: aquí solo se le dice qué tipo y qué tamaño. */
export async function getPhotoUploadUrl(
  token: string,
  contentType: string,
  sizeBytes: number,
): Promise<{ upload_url: string; storage_key: string } | null> {
  try {
    return await apiFetch(`/v1/public/donations/manage/${encodeURIComponent(token)}/photos/upload-url`, {
      method: "POST",
      body: JSON.stringify({ content_type: contentType, size_bytes: sizeBytes }),
    })
  } catch {
    return null
  }
}

export async function confirmPhoto(
  token: string,
  storageKey: string,
  contentType: string,
  sizeBytes: number,
): Promise<ManagedPhoto | null> {
  try {
    return await apiFetch<ManagedPhoto>(`/v1/public/donations/manage/${encodeURIComponent(token)}/photos`, {
      method: "POST",
      body: JSON.stringify({ storage_key: storageKey, content_type: contentType, size_bytes: sizeBytes }),
    })
  } catch {
    return null
  }
}

export async function getPhotoUrl(token: string, photoId: string): Promise<string | null> {
  try {
    const res = await apiFetch<{ url: string }>(
      `/v1/public/donations/manage/${encodeURIComponent(token)}/photos/${photoId}/url`
    )
    return res.url
  } catch {
    return null
  }
}

export async function deletePhoto(token: string, photoId: string): Promise<boolean> {
  try {
    await apiFetch(`/v1/public/donations/manage/${encodeURIComponent(token)}/photos/${photoId}`, {
      method: "DELETE",
    })
    return true
  } catch {
    return false
  }
}
