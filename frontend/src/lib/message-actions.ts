"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { revalidatePath } from "next/cache"

export async function createThreadAction(data: {
  title: string
  body: string
  thread_type: string
  campaign_id: string
  recipient_ids: string[]
}) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }
  try {
    const result = await apiFetch("/v1/messages", {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify(data),
    })
    revalidatePath("/dashboard/messages")
    return { data: result }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function addReplyAction(threadId: string, body: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }
  try {
    const result = await apiFetch(`/v1/messages/${threadId}/replies`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ body }),
    })
    revalidatePath("/dashboard/messages")
    return { data: result }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function markReadAction(threadId: string) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }
  try {
    await apiFetch(`/v1/messages/${threadId}/read`, {
      method: "PATCH",
      token: session.accessToken,
    })
    revalidatePath("/dashboard/messages")
    return { data: null }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function getUploadUrlAction(data: {
  filename: string
  content_type: string
  size_bytes: number
}) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }
  try {
    const result = await apiFetch("/v1/messages/attachments/upload-url", {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify(data),
    })
    return { data: result as { upload_url: string; r2_key: string } }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function confirmAttachmentAction(data: {
  r2_key: string
  filename: string
  content_type: string
  size_bytes: number
  thread_id?: string
  reply_id?: string
}) {
  const session = await auth()
  if (!session?.accessToken) return { error: "No autenticado" }
  try {
    const result = await apiFetch("/v1/messages/attachments/confirm", {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify(data),
    })
    return { data: result }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" }
  }
}
