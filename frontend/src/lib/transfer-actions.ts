"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { revalidatePath } from "next/cache"

export async function createTransferAction(data: {
  from_center_id: string
  to_center_id: string
  box_ids: string[]
  notes?: string
}) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }
  try {
    const result = await apiFetch("/v1/transfers", {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify(data),
    })
    revalidatePath("/dashboard/transfers")
    return { data: result }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function approveTransferAction(transferId: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }
  try {
    const result = await apiFetch(`/v1/transfers/${transferId}/approve`, {
      method: "POST",
      token: session.accessToken,
    })
    revalidatePath("/dashboard/transfers")
    return { data: result }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function rejectTransferAction(transferId: string, reason?: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }
  try {
    const result = await apiFetch(`/v1/transfers/${transferId}/reject`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ reason: reason ?? null }),
    })
    revalidatePath("/dashboard/transfers")
    return { data: result }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function dispatchTransferAction(transferId: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }
  try {
    const result = await apiFetch(`/v1/transfers/${transferId}/dispatch`, {
      method: "POST",
      token: session.accessToken,
    })
    revalidatePath("/dashboard/transfers")
    return { data: result }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function receiveTransferAction(transferId: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }
  try {
    const result = await apiFetch(`/v1/transfers/${transferId}/receive`, {
      method: "POST",
      token: session.accessToken,
    })
    revalidatePath("/dashboard/transfers")
    return { data: result }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" }
  }
}
