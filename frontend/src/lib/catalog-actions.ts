"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { revalidatePath } from "next/cache"
import type { ProductAlias, ProductType } from "@/types"

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

export async function promoteProductTypeAction(
  id: string
): Promise<{ data?: ProductType; error?: string }> {
  const session = await auth()
  try {
    const pt = await apiFetch<ProductType>(`/v1/product-types/${id}/promote`, {
      method: "POST",
      token: session?.accessToken,
    })
    revalidatePath("/dashboard/catalog")
    return { data: pt }
  } catch (err: unknown) {
    if (err instanceof Error) return { error: err.message }
    return { error: "Error al promover el tipo de producto" }
  }
}

export async function unlinkProductGtinAction(
  productTypeId: string,
  gtinId: string
): Promise<{ ok?: true; error?: string }> {
  const session = await auth()
  try {
    await apiFetch(`/v1/product-types/${productTypeId}/gtins/${gtinId}`, {
      method: "DELETE",
      token: session?.accessToken,
    })
    revalidatePath("/dashboard/catalog")
    return { ok: true }
  } catch (err: unknown) {
    if (err instanceof Error) return { error: err.message }
    return { error: "Error al desligar el código de barras" }
  }
}

export async function addProductAliasAction(
  productTypeId: string,
  alias: string
): Promise<{ data?: ProductAlias; error?: string }> {
  const session = await auth()
  try {
    const fila = await apiFetch<ProductAlias>(`/v1/product-types/${productTypeId}/aliases`, {
      method: "POST",
      token: session?.accessToken,
      body: JSON.stringify({ alias }),
    })
    revalidatePath("/dashboard/catalog")
    return { data: fila }
  } catch (err: unknown) {
    // El backend explica por qué lo rechaza —ya existe, o el catálogo ya lo
    // encontraba sin él— y ese mensaje es más útil que uno genérico: dice qué
    // hacer en vez de solo que no se pudo.
    if (err instanceof Error) return { error: err.message }
    return { error: "Error al agregar el alias" }
  }
}

export async function removeProductAliasAction(
  productTypeId: string,
  aliasId: string
): Promise<{ ok?: true; error?: string }> {
  const session = await auth()
  try {
    await apiFetch(`/v1/product-types/${productTypeId}/aliases/${aliasId}`, {
      method: "DELETE",
      token: session?.accessToken,
    })
    revalidatePath("/dashboard/catalog")
    return { ok: true }
  } catch (err: unknown) {
    if (err instanceof Error) return { error: err.message }
    return { error: "Error al quitar el alias" }
  }
}
