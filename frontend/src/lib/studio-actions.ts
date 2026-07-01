"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import type { UserOut } from "@/types"

export interface StudioUserCreate {
  email: string
  username: string
  full_name?: string
  center_id?: string
  center_role: string
  password?: string
}

export interface StudioUserPatch {
  center_id?: string | null
  center_role?: string
  is_active?: boolean
  full_name?: string
}

export async function listStudioUsersAction(params?: {
  center_id?: string
  center_role?: string
  is_active?: boolean
  limit?: number
  offset?: number
}): Promise<UserOut[]> {
  const session = await auth()
  if (!session?.accessToken) return []
  const qs = new URLSearchParams()
  if (params?.center_id) qs.set("center_id", params.center_id)
  if (params?.center_role) qs.set("center_role", params.center_role)
  if (params?.is_active !== undefined) qs.set("is_active", String(params.is_active))
  if (params?.limit) qs.set("limit", String(params.limit))
  if (params?.offset) qs.set("offset", String(params.offset))
  const q = qs.toString()
  return apiFetch<UserOut[]>(`/v1/studio/users${q ? `?${q}` : ""}`, { token: session.accessToken })
}

export async function createStudioUserAction(data: StudioUserCreate): Promise<UserOut> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("No autenticado")
  return apiFetch<UserOut>("/v1/studio/users", {
    method: "POST",
    body: JSON.stringify(data),
    token: session.accessToken,
  })
}

export async function patchStudioUserAction(userId: string, data: StudioUserPatch): Promise<UserOut> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("No autenticado")
  return apiFetch<UserOut>(`/v1/studio/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    token: session.accessToken,
  })
}

export async function reinviteStudioUserAction(userId: string): Promise<void> {
  const session = await auth()
  if (!session?.accessToken) throw new Error("No autenticado")
  await apiFetch(`/v1/studio/users/${userId}/reinvite`, {
    method: "POST",
    token: session.accessToken,
  })
}

export interface AuditEntry {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  ip: string | null
  created_at: string
}

export interface AuditListOut {
  items: AuditEntry[]
  total: number
  limit: number
  offset: number
}

export async function listAuditAction(params?: {
  entity_type?: string
  user_id?: string
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}): Promise<AuditListOut> {
  const session = await auth()
  if (!session?.accessToken) return { items: [], total: 0, limit: 50, offset: 0 }
  const qs = new URLSearchParams()
  if (params?.entity_type) qs.set("entity_type", params.entity_type)
  if (params?.user_id) qs.set("user_id", params.user_id)
  if (params?.from_date) qs.set("from_date", params.from_date)
  if (params?.to_date) qs.set("to_date", params.to_date)
  if (params?.limit) qs.set("limit", String(params.limit))
  if (params?.offset) qs.set("offset", String(params.offset))
  const q = qs.toString()
  return apiFetch<AuditListOut>(`/v1/studio/audit${q ? `?${q}` : ""}`, { token: session.accessToken })
}
