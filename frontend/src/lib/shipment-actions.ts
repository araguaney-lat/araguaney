"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { revalidatePath } from "next/cache"

export async function createShipmentAction(data: {
  campaign_id?: string
  destination?: string
  carrier?: string
  reference?: string
  notes?: string
  center_id?: string
  // Restricción de altura del envío (Fase 21): se advierte, no bloquea.
  height_profile?: string
}) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const result = await apiFetch("/v1/shipments", {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({
        campaign_id: data.campaign_id ?? null,
        destination: data.destination ?? "Venezuela",
        carrier: data.carrier ?? null,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        center_id: data.center_id ?? undefined,
      }),
    })
    revalidatePath("/dashboard/shipments")
    return { data: result }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al crear envío" }
  }
}

export async function addPalletToShipmentAction(shipmentId: string, palletId: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch(`/v1/shipments/${shipmentId}/add-pallet`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ pallet_id: palletId }),
    })
    revalidatePath("/dashboard/shipments")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al agregar tarima" }
  }
}

export async function closeShipmentAction(shipmentId: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch(`/v1/shipments/${shipmentId}/close`, {
      method: "POST",
      token: session.accessToken,
    })
    revalidatePath("/dashboard/shipments")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al cerrar envío" }
  }
}

export async function shipShipmentAction(shipmentId: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch(`/v1/shipments/${shipmentId}/ship`, {
      method: "POST",
      token: session.accessToken,
    })
    revalidatePath("/dashboard/shipments")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al despachar envío" }
  }
}


// ── Después de despachar (Fase 22) ──────────────────────────────────────────

export async function addMilestoneAction(
  shipmentId: string,
  milestone: string,
  note?: string,
  occurredAt?: string,
) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch(`/v1/shipments/${shipmentId}/milestones`, {
      method: "POST",
      token: session.accessToken,
      // Sin fecha, el backend usa la de ahora. Se manda cuando quien registra
      // sabe que el hecho ocurrió antes, que es el caso habitual.
      body: JSON.stringify({
        milestone,
        note: note?.trim() || undefined,
        occurred_at: occurredAt || undefined,
      }),
    })
    revalidatePath("/dashboard/shipments")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al registrar el hito" }
  }
}

export async function markDeliveredAction(shipmentId: string, note?: string, deliveredAt?: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch(`/v1/shipments/${shipmentId}/delivered`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ note: note?.trim() || undefined, delivered_at: deliveredAt || undefined }),
    })
    revalidatePath("/dashboard/shipments")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al marcar la entrega" }
  }
}

export async function reconcileReceptionAction(
  shipmentId: string,
  payload: {
    exceptions: { box_id: string; outcome: string; note?: string }[]
    pallet_weights: { pallet_id: string; gross_weight_kg: string }[]
    consignee_name?: string
    notes?: string
  },
) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch(`/v1/shipments/${shipmentId}/reception`, {
      method: "POST",
      token: session.accessToken,
      // Solo viajan las excepciones: lo que no va en la lista se da por recibido.
      body: JSON.stringify({
        exceptions: payload.exceptions,
        pallet_weights: payload.pallet_weights,
        consignee_name: payload.consignee_name?.trim() || undefined,
        notes: payload.notes?.trim() || undefined,
      }),
    })
    revalidatePath("/dashboard/shipments")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al registrar la recepción" }
  }
}
