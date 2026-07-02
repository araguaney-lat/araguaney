import { ImageResponse } from "next/og"
import { apiFetch } from "@/lib/api"
import type { PublicNeedsOut } from "@/types"

export const revalidate = 300
export const alt = "Qué falta — Inventario de ayuda humanitaria en tiempo real"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const CATEGORY_LABELS: Record<string, string> = {
  MEDICINE: "Medicamentos",
  MEDICAL_SUPPLY: "Insumos médicos",
  FOOD: "Alimentos",
  WATER: "Agua",
  HYGIENE: "Higiene",
  TOOL: "Herramientas",
  RESCUE_GEAR: "Equipo de rescate",
  OTHER: "Otros",
}

export default async function Image() {
  let data: PublicNeedsOut | null = null
  try {
    data = await apiFetch<PublicNeedsOut>("/v1/public/needs", {
      next: { revalidate: 300, tags: ["public-needs"] },
    })
  } catch {
    data = null
  }

  const topCategories = (data?.by_category ?? []).slice(0, 4)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#FBF7EE",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 28, height: 3, background: "#906400" }} />
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2, color: "#946A00", textTransform: "uppercase" }}>
            Araguaney
          </div>
        </div>

        <div style={{ fontSize: 64, fontWeight: 700, color: "#2B2723", marginBottom: 12, display: "flex" }}>
          Qué falta
        </div>
        <div style={{ fontSize: 26, color: "#5C5347", marginBottom: 44, display: "flex" }}>
          Inventario de ayuda humanitaria — actualizado en tiempo real
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {topCategories.length === 0 ? (
            <div style={{ fontSize: 24, color: "#6E6557", display: "flex" }}>
              Sin inventario disponible en este momento
            </div>
          ) : (
            topCategories.map((row) => (
              <div
                key={row.category}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#fff",
                  border: "1px solid #EEE6D4",
                  borderRadius: 14,
                  padding: "18px 28px",
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 600, color: "#2B2723", display: "flex" }}>
                  {CATEGORY_LABELS[row.category] ?? row.category}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#1F5E8C", display: "flex" }}>
                  {row.total_units.toLocaleString()} unidades
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    ),
    { ...size }
  )
}
