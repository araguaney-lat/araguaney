import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { getDictionary } from "@/lib/i18n"
import type { PublicCampaign } from "@/types"

export const revalidate = 300

const API_URL = process.env.API_URL ?? "http://localhost:8000"

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

async function fetchCampaign(slug: string): Promise<PublicCampaign | null> {
  try {
    const res = await fetch(`${API_URL}/v1/public/campaigns/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300, tags: [`campaign-${slug}`] },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const campaign = await fetchCampaign(slug)

  if (!campaign) {
    return { title: "Campaña no encontrada", robots: { index: false, follow: false } }
  }

  const title = `Qué falta — ${campaign.name}`
  const description =
    campaign.description ??
    `Inventario de ayuda humanitaria disponible para ${campaign.name}, actualizado en tiempo real.`

  return {
    title,
    description,
    alternates: { canonical: `/eventos/${campaign.slug}` },
    openGraph: { title: `${title} — Araguaney`, description },
    twitter: { title: `${title} — Araguaney`, description },
  }
}

export default async function EventoPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const campaign = await fetchCampaign(slug)

  if (!campaign) notFound()

  // Campaign name/description are admin-entered Spanish-only data (no i18n at
  // the model level) — fixing the nav to "es" avoids an English nav wrapping
  // Spanish campaign content when the visitor's locale cookie is "en".
  const dict = await getDictionary("es")

  return (
    <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <HomeNav dict={dict.nav} locale="es" localeLinks={{}} />
      <div className="h-[56px] md:hidden" />

      {/* ── Hero ── */}
      <div className="px-5 md:px-[46px] pt-[26px] md:pt-[56px] pb-8 md:pb-10">
        <div className="max-w-[720px]">
          <div
            className="text-[10.5px] md:text-[12px] mb-3"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#B07D00",
              fontWeight: 700,
            }}
          >
            <span style={{ width: 18, height: 1.5, background: "#E0A100", display: "inline-block" }} />
            Ayuda humanitaria
          </div>

          <h1
            className="text-[26px] md:text-[38px] mb-3"
            style={{
              fontFamily: "var(--font-source-serif)",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.3px",
              margin: "0 0 12px",
            }}
          >
            {campaign.name}
          </h1>

          {campaign.description && (
            <p
              className="text-[14.5px] md:text-[16px]"
              style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: 560 }}
            >
              {campaign.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Qué falta ── */}
      <div className="px-5 md:px-[46px] py-8 md:py-10" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
        <div className="max-w-2xl mx-auto w-full">
          <h2
            className="text-[18px] md:text-[22px] mb-1"
            style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 4px" }}
          >
            Qué falta
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            Stock sellado consolidado para esta campaña. Actualizado cada 5 minutos.
          </p>

          {campaign.by_category.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              No hay inventario disponible en este momento.
            </div>
          ) : (
            <div className="space-y-3">
              {campaign.by_category.map((row) => (
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
                    <p className="text-lg font-bold text-zinc-900">{row.total_units.toLocaleString()}</p>
                    <p className="text-xs text-zinc-400">unidades</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CTA final + link cruzado ── */}
      <div className="px-5 md:px-[46px] py-10 md:py-12 text-center" style={{ borderTop: "1px solid #EFE7D6" }}>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-[26px] py-[14px] mb-4"
          style={{
            background: "#1F5E8C",
            color: "#fff",
            fontWeight: 600,
            fontSize: 15,
            borderRadius: 99,
            boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)",
          }}
        >
          Sumar un centro de acopio
        </Link>
        <p className="text-[13.5px]" style={{ color: "#8A8073" }}>
          ¿Quieres saber cómo funciona para cualquier emergencia?{" "}
          <Link href="/ayuda-humanitaria" style={{ color: "#1F5E8C", fontWeight: 600 }}>
            Conoce Araguaney →
          </Link>
        </p>
      </div>

      <HomeFooter dict={dict.footer} />
    </div>
  )
}
