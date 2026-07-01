"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { revalidatePath } from "next/cache"
import type { ProductType } from "@/types"

export interface ProductTypeFormData {
  category: string
  display_name: string
  inn_name?: string
  brand?: string
  strength?: string
  form?: string
  gtin?: string
  default_unit?: string
  is_controlled?: boolean
  min_shelf_life_days?: number
}

export async function createProductTypeAction(
  data: ProductTypeFormData
): Promise<{ data?: ProductType; error?: string }> {
  const session = await auth()
  try {
    const pt = await apiFetch<ProductType>("/v1/product-types", {
      method: "POST",
      token: session?.accessToken,
      body: JSON.stringify(data),
    })
    revalidatePath("/dashboard/catalog")
    return { data: pt }
  } catch (err: unknown) {
    if (err instanceof Error) return { error: err.message }
    return { error: "Error al crear el tipo de producto" }
  }
}
