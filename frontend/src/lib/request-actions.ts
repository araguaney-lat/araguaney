"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"

export interface RequestMessage {
  id: string
  request_id: string
  author_id: string | null
  body: string
  created_at: string
}

export interface RequestOut {
  id: string
  author_id: string | null
  center_id: string | null
  title: string
  description: string
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  created_at: string
  updated_at: string
  messages: RequestMessage[]
}

export async function listRequestsAction(params?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<RequestOut[]> {
  const session = await auth()
  if (!session?.accessToken) return []
  const qs = new URLSearchParams()
  if (params?.status) qs.set("status", params.status)
  if (params?.limit) qs.set("limit", String(params.limit))
  if (params?.offset) qs.set("offset", String(params.offset))
  const q = qs.toString()
  return apiFetch<RequestOut[]>(`/v1/requests${q ? `?${q}` : ""}`, { token: session.accessToken })
}

export async function createRequestAction(data: {
  title: string
  description: string
}): Promise<RequestOut> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("No autenticado")
  return apiFetch<RequestOut>("/v1/requests", {
    method: "POST",
    body: JSON.stringify(data),
    token: session.accessToken,
  })
}

export async function addRequestMessageAction(requestId: string, body: string): Promise<RequestMessage> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("No autenticado")
  return apiFetch<RequestMessage>(`/v1/requests/${requestId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
    token: session.accessToken,
  })
}

export async function updateRequestStatusAction(requestId: string, status: string): Promise<RequestOut> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("No autenticado")
  return apiFetch<RequestOut>(`/v1/requests/${requestId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    token: session.accessToken,
  })
}
