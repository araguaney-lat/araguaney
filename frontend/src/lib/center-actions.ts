"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { revalidateTag } from "next/cache"
import type { Center } from "@/types"

export interface CenterFormData {
  name: string
  address?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  country_code?: string
  state_name?: string
}

export async function createCenterAction(data: CenterFormData): Promise<Center> {
  const session = await auth()
  const center = await apiFetch<Center>("/v1/centers", {
    method: "POST",
    token: session?.accessToken,
    body: JSON.stringify(data),
  })
  revalidateTag("centers", "max")
  return center
}

export async function updateCenterAction(
  id: string,
  data: Partial<CenterFormData> & { is_active?: boolean }
): Promise<Center> {
  const session = await auth()
  const center = await apiFetch<Center>(`/v1/centers/${id}`, {
    method: "PATCH",
    token: session?.accessToken,
    body: JSON.stringify(data),
  })
  revalidateTag("centers", "max")
  return center
}
