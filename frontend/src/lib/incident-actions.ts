"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { revalidatePath } from "next/cache"

export async function createIncidentAction(
  shipmentId: string,
  payload: { type: string; description: string; pallet_id?: string; box_id?: string },
) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch(`/v1/shipments/${shipmentId}/incidents`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify(payload),
    })
    revalidatePath("/dashboard/shipments")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al levantar la incidencia" }
  }
}

export async function resolveIncidentAction(incidentId: string, note: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch(`/v1/incidents/${incidentId}/resolve`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ note }),
    })
    revalidatePath("/dashboard/shipments")
    revalidatePath("/dashboard/admin/incidents")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al resolver la incidencia" }
  }
}
