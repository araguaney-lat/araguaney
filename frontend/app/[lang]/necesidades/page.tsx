import type { Metadata } from "next"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"
import { slugForCategory } from "@/lib/needs-categories"
import type { PublicNeedsOut } from "@/types"

const KEY = "necesidades"

export const revalidate = 300

const CATEGORY_LABELS: Record<Locale, Record<string, string>> = {
  es: {
    MEDICINE: "Medicamentos",
    MEDICAL_SUPPLY: "Insumos médicos",
    FOOD: "Alimentos",
    WATER: "Agua",
    HYGIENE: "Higiene",
    TOOL: "Herramientas",
    RESCUE_GEAR: "Equipo de rescate",
    OTHER: "Otros",
  },
  en: {
    MEDICINE: "Medicine",
    MEDICAL_SUPPLY: "Medical supplies",
    FOOD: "Food",
    WATER: "Water",
    HYGIENE: "Hygiene",
    TOOL: "Tools",
    RESCUE_GEAR: "Rescue gear",
    OTHER: "Other",
  },
}

const CATEGORY_EMOJI: Record<string, string> = {
  MEDICINE: "💊", MEDICAL_SUPPLY: "🩺", FOOD: "🥫", WATER: "💧",
  HYGIENE: "🧼", TOOL: "🔧", RESCUE_GEAR: "🦺", OTHER: "📦",
}

const UI: Record<Locale, {
  h1: string; subtitle: string; empty: string; boxes: string; units: string
  donateLink: string; privacy: string; ogEyebrow: string
}> = {
  es: {
    h1: "Inventario disponible",
    subtitle: "Stock sellado consolidado de los centros de acopio activos. Actualizado cada 5 minutos.",
    empty: "No hay inventario disponible en este momento.",
    boxes: "cajas",
    units: "unidades",
    donateLink: "¿Qué se puede donar? →",
    privacy: "Esta página es pública y no contiene información personal.",
    ogEyebrow: "Qué falta",
  },
  en: {
    h1: "Available inventory",
    subtitle: "Consolidated sealed stock from active collection centers. Updated every 5 minutes.",
    empty: "No inventory available right now.",
    boxes: "boxes",
    units: "units",
    donateLink: "What can be donated? →",
    privacy: "This page is public and contains no personal data.",
    ogEyebrow: "Needs",
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
  const { lang } = await params
  const dict = await getDictionary(lang)
  const { necesidades_title, necesidades_description } = dict.seo
  const ogImage = ogImageUrl(necesidades_title, UI[lang].ogEyebrow)
  return {
    title: necesidades_title,
    description: necesidades_description,
    alternates: alternates(KEY, lang),
    openGraph: { title: necesidades_title, description: necesidades_description, images: [ogImage] },
    twitter: { card: "summary_large_image", title: necesidades_title, description: necesidades_description, images: [ogImage] },
  }
}

export default async function NecesidadesPage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang: locale } = await params
  const t = UI[locale]
  const labels = CATEGORY_LABELS[locale]

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
          <h1 className="text-2xl font-bold text-zinc-900">{t.h1}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t.subtitle}</p>
        </div>

        {!data || data.by_category.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
            {t.empty}
          </div>
        ) : (
          <div className="space-y-3">
            {data.by_category.map((row) => {
              const esSlug = slugForCategory(row.category)
              const inner = (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden>
                      {CATEGORY_EMOJI[row.category] ?? "📦"}
                    </span>
                    <div>
                      <p className="font-medium text-zinc-900">
                        {labels[row.category] ?? row.category}
                      </p>
                      <p className="text-xs text-zinc-500">{row.box_count.toLocaleString()} {t.boxes}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-zinc-900">
                      {row.total_units.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500">{t.units}</p>
                  </div>
                </>
              )
              const className =
                "flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4"
              return esSlug ? (
                <Link
                  key={row.category}
                  href={localizedPath(`necesidades/${esSlug}`, locale)}
                  className={`${className} transition-colors hover:border-zinc-300`}
                >
                  {inner}
                </Link>
              ) : (
                <div key={row.category} className={className}>
                  {inner}
                </div>
              )
            })}
          </div>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href={localizedPath("guias/que-se-puede-donar", locale)} className="text-blue-600 font-medium hover:text-blue-800">
            {t.donateLink}
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-zinc-500">{t.privacy}</p>
      </div>
    </div>
  )
}
