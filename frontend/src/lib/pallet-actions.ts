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

export async function downloadPalletLabelAction(palletId: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const API_URL = process.env.API_URL ?? "http://localhost:8000"
    const res = await fetch(`${API_URL}/v1/pallets/${palletId}/label.pdf`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { error: body.error?.message ?? "Error al generar etiqueta" }
    }
    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    return { pdf: base64, filename: `tarima-${palletId.slice(0, 8)}.pdf` }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al descargar etiqueta" }
  }
}
