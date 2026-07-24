"use server"

import { auth } from "@/auth"
import { apiFetch, ApiError } from "@/lib/api"

export interface EmailFailure {
  id: string
  resend_email_id: string
  to_email: string
  email_type: string
  entity_type: string | null
  entity_id: string | null
  event_type: string
  reason: string | null
  occurred_at: string | null
  resolved_at: string | null
  created_at: string
}

export type ResendResult = { ok: true } | { ok: false; error: string }

async function superadminToken(): Promise<string | null> {
  const session = await auth()
  if (session?.platformRole !== "superadmin" || !session.accessToken) return null
  return session.accessToken
}

export async function listEmailFailures(eventType?: string): Promise<EmailFailure[]> {
  const token = await superadminToken()
  if (!token) return []
  const q = eventType ? `?event_type=${encodeURIComponent(eventType)}` : ""
  return apiFetch<EmailFailure[]>(`/v1/email-failures${q}`, { token })
}

export async function resendEmail(id: string): Promise<ResendResult> {
  const token = await superadminToken()
  if (!token) return { ok: false, error: "unauthorized" }
  try {
    await apiFetch(`/v1/email-failures/${id}/resend`, { method: "POST", token })
    return { ok: true }
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.code ?? err.message }
    return { ok: false, error: "error" }
  }
}
