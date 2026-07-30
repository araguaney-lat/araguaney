"use server"

import { z } from "zod"

import { apiFetch, ApiError } from "@/lib/api"
import { verifyTurnstile } from "@/lib/turnstile"

/** Resultado uniforme: la página nunca ve el error crudo del backend. */
export type DonationResult =
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
  DUPLICATE_DONATION: {
    es: "Ya tienes una donación registrada sin entregar. Revisa tu correo.",
    en: "You already have a registered donation pending delivery. Check your email.",
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
    const res = await apiFetch<{ code: string }>("/v1/public/donations", {
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
    return { ok: true, code: res.code }
  } catch (err) {
    const code = err instanceof ApiError ? err.code : null
    const msg = (code && MESSAGES[code]?.[locale]) || MESSAGES.GENERIC[locale]
    return { ok: false, error: msg }
  }
}

export async function confirmDonation(token: string, locale = "es"): Promise<DonationResult> {
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
    return { ok: true, code: "" }
  } catch {
    return { ok: false, error: MESSAGES.RESEND_GENERIC[locale] }
  }
}
