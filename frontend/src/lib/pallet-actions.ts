"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { revalidatePath } from "next/cache"

export async function createPalletAction(notes?: string, centerId?: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch("/v1/pallets", {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ notes: notes ?? null, center_id: centerId ?? undefined }),
    })
    revalidatePath("/dashboard/pallets")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al crear tarima" }
  }
}

export async function addBoxToPalletAction(palletId: string, boxCode: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch(`/v1/pallets/${palletId}/add-box`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ code: boxCode }),
    })
    revalidatePath("/dashboard/pallets")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al agregar caja" }
  }
}

export async function closePalletAction(
  palletId: string,
  weighing?: { gross_weight_kg?: number; height_cm?: number },
) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    // El pesaje viaja en el cierre porque es cuando ocurre: la tarima ya está
    // armada y sube a la báscula una sola vez.
    const data = await apiFetch(`/v1/pallets/${palletId}/close`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify(weighing ?? {}),
    })
    revalidatePath("/dashboard/pallets")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al cerrar tarima" }
  }
}

