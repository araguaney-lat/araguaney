"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { revalidatePath } from "next/cache"

export async function sealBoxAction(boxId: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }

  try {
    const data = await apiFetch(`/v1/boxes/${boxId}/seal`, {
      method: "POST",
      token: session.accessToken,
    })
    revalidatePath("/dashboard/boxes")
    return { data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al sellar caja" }
  }
}

