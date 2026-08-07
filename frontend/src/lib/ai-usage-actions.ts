"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"

/* Lectura del gasto de IA para `/studio` (Fase 23, task 3).
 *
 * Solo lee. El interruptor de cada capacidad vive en las variables de entorno
 * del backend; un panel que también pudiera cambiarlo sería una segunda fuente
 * de verdad sobre el mismo estado. */

export interface AICapabilityUsage {
  capability: string
  enabled: boolean
  calls: number
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

export interface AIUsageReport {
  month_start: string
  monthly_budget_usd: number
  month_spend_usd: number
  budget_exhausted: boolean
  provider_configured: boolean
  model: string
  capabilities: AICapabilityUsage[]
  daily: { day: string; cost_usd: number; calls: number }[]
  top_centers: { center_name: string; cost_usd: number }[]
}

export async function getAIUsageReport(): Promise<AIUsageReport | null> {
  const session = await auth()
  if (session?.platformRole !== "superadmin" || !session.accessToken) return null

  try {
    return await apiFetch<AIUsageReport>("/v1/studio/ai-usage", {
      token: session.accessToken,
      next: { revalidate: 0 },
    })
  } catch {
    // El panel no es crítico: si el backend no responde se enseña el estado
    // vacío en vez de tumbar `/studio`.
    return null
  }
}
