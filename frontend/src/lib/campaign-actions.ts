"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { revalidateTag } from "next/cache"
import type { Campaign } from "@/types"

export interface CampaignFormData {
  name: string
  origin_country?: string
  destination_country?: string
  description?: string
  start_date?: string
  end_date?: string
  center_ids?: string[]
}

export async function createCampaignAction(data: CampaignFormData): Promise<Campaign> {
  const session = await auth()
  const campaign = await apiFetch<Campaign>("/v1/campaigns", {
    method: "POST",
    token: session?.accessToken,
    body: JSON.stringify(data),
  })
  revalidateTag("campaigns", "max")
  return campaign
}

export async function updateCampaignAction(
  id: string,
  data: Partial<CampaignFormData> & { is_active?: boolean }
): Promise<Campaign> {
  const session = await auth()
  const campaign = await apiFetch<Campaign>(`/v1/campaigns/${id}`, {
    method: "PATCH",
    token: session?.accessToken,
    body: JSON.stringify(data),
  })
  revalidateTag("campaigns", "max")
  return campaign
}
