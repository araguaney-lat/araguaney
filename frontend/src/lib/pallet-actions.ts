"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { revalidatePath } from "next/cache"

export async function createPalletAction(notes?: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch("/v1/pallets", {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ notes: notes ?? null }),
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

export async function closePalletAction(palletId: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch(`/v1/pallets/${palletId}/close`, {
      method: "POST",
      token: session.accessToken,
    })
    revalidatePath("/dashboard/pallets")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al cerrar tarima" }
  }
}

