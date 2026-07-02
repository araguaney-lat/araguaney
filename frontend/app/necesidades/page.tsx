import type { Metadata } from "next"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { getLocale, getDictionary } from "@/lib/i18n"
import type { PublicNeedsOut } from "@/types"

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const { necesidades_title, necesidades_description } = dict.seo

  return {
    title: necesidades_title,
    description: necesidades_description,
    alternates: { canonical: "/necesidades" },
    openGraph: { title: necesidades_title, description: necesidades_description },
    twitter: { title: necesidades_title, description: necesidades_description },
  }
}

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

const CATEGORY_EMOJI: Record<string, string> = {
  MEDICINE: "💊",
  MEDICAL_SUPPLY: "🩺",
  FOOD: "🥫",
  WATER: "💧",
  HYGIENE: "🧼",
  TOOL: "🔧",
  RESCUE_GEAR: "🦺",
  OTHER: "📦",
}

export default async function NecesidadesPage() {
  let data: PublicNeedsOut | null = null

  try {
    data = await apiFetch<PublicNeedsOut>("/v1/public/needs", {
      next: { revalidate: 300, tags: ["public-needs"] },
    })
  } catch {
    data = null
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">Inventario disponible</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Stock sellado consolidado de los centros de acopio activos.
            Actualizado cada 5 minutos.
          </p>
        </div>

        {!data || data.by_category.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
            No hay inventario disponible en este momento.
          </div>
        ) : (
          <div className="space-y-3">
            {data.by_category.map((row) => (
              <div
                key={row.category}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl" aria-hidden>
                    {CATEGORY_EMOJI[row.category] ?? "📦"}
                  </span>
                  <div>
                    <p className="font-medium text-zinc-900">
                      {CATEGORY_LABELS[row.category] ?? row.category}
                    </p>
                    <p className="text-xs text-zinc-400">{row.box_count.toLocaleString()} cajas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-zinc-900">
                    {row.total_units.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-400">unidades</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/guias/que-se-puede-donar" className="text-blue-600 font-medium hover:text-blue-800">
            ¿Qué se puede donar? →
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-zinc-400">
          Esta página es pública y no contiene información personal.
        </p>
      </div>
    </div>
  )
}
