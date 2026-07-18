import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { JsonLd } from "@/components/JsonLd"
import { CtaLink } from "@/components/CtaLink"
import { apiFetch } from "@/lib/api"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl } from "@/lib/seo"
import { breadcrumbSchema, type Schema } from "@/lib/structured-data"
import { findNeedsCategory } from "@/lib/needs-categories"
import type { PublicNeedsOut } from "@/types"

// Rendered on-demand at request time (ISR, revalidate 300), NOT prerendered at
// build. generateStaticParams would fetch the backend during `next build`,
// which hangs the Vercel build (see app/sitemap.ts). Unknown slugs 404 via
// findNeedsCategory + notFound(). The valid slugs are still listed in the
// sitemap, so they get crawled and generated on first hit.
export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const entry = findNeedsCategory(category)
  if (!entry) {
    return { title: "Categoría no encontrada", robots: { index: false, follow: false } }
  }
  const path = `/necesidades/${entry.slug}`
  const ogImage = ogImageUrl(`Qué falta: ${entry.label}`, "Qué falta")
  return {
    title: entry.metaTitle,
    description: entry.metaDescription,
    alternates: { canonical: path },
    openGraph: { title: `${entry.metaTitle} — Araguaney`, description: entry.metaDescription, images: [ogImage] },
    twitter: { card: "summary_large_image", title: `${entry.metaTitle} — Araguaney`, description: entry.metaDescription, images: [ogImage] },
  }
}

async function fetchTotals(categoryEnum: string): Promise<{ units: number; boxes: number } | null> {
  try {
    const data = await apiFetch<PublicNeedsOut>("/v1/public/needs", {
      next: { revalidate: 300, tags: ["public-needs"] },
      signal: AbortSignal.timeout(5000),
    })
    const row = data.by_category.find((r) => r.category === categoryEnum)
    return row ? { units: row.total_units, boxes: row.box_count } : { units: 0, boxes: 0 }
  } catch {
    return null
  }
}

export default async function NeedsCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const entry = findNeedsCategory(category)
  if (!entry) notFound()

  const dict = await getDictionary("es")
  const totals = await fetchTotals(entry.category)

  const path = `/necesidades/${entry.slug}`
  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Qué falta", path: "/necesidades" },
    { name: entry.label, path },
  ] as const
  const structuredData: Schema[] = [breadcrumbSchema(crumbs)]

  return (
    <>
      <JsonLd data={structuredData} />
      <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <HomeNav dict={dict.nav} locale="es" localeLinks={{}} />
        <div className="h-[56px] md:hidden" />

        <article className="px-5 md:px-[46px] pt-[26px] md:pt-[56px] pb-16 md:pb-20 flex-1">
          <div className="max-w-[680px] mx-auto">
            <div className="mb-4">
              <Breadcrumbs items={crumbs} />
            </div>

            <div
              className="text-[10.5px] md:text-[12px] mb-3"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#946A00",
                fontWeight: 700,
              }}
            >
              <span style={{ width: 18, height: 1.5, background: "#906400", display: "inline-block" }} />
              Qué falta
            </div>

            <h1
              className="text-[28px] md:text-[38px] mb-4"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.15, margin: "0 0 16px" }}
            >
              <span aria-hidden style={{ marginRight: 10 }}>{entry.emoji}</span>
              Donar {entry.label.toLowerCase()}
            </h1>

            <p className="text-[15px] md:text-[17px] mb-8" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {entry.intro}
            </p>

            {/* ── Live total ── */}
            <div
              className="flex items-center justify-between p-5 mb-10"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <div>
                <p className="text-[13px]" style={{ color: "#6E6557", margin: 0 }}>
                  Disponible ahora en centros activos
                </p>
                <p className="text-[12px]" style={{ color: "#8A8073", margin: "2px 0 0" }}>
                  {totals ? `${totals.boxes.toLocaleString()} cajas` : "Actualizado cada 5 minutos"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[26px] md:text-[30px] font-bold" style={{ color: "#1F5E8C", margin: 0 }}>
                  {totals ? totals.units.toLocaleString() : "—"}
                </p>
                <p className="text-[12px]" style={{ color: "#8A8073", margin: 0 }}>unidades</p>
              </div>
            </div>

            <h2 style={h2Style}>Qué se acepta</h2>
            <ul className="mb-8 mt-2" style={{ listStyle: "none", padding: 0, margin: "8px 0 32px" }}>
              {entry.accepted.map((item) => (
                <li key={item} className="flex gap-2.5 mb-2.5" style={{ color: "#5C5347", lineHeight: 1.55, fontSize: 15 }}>
                  <span aria-hidden style={{ color: "#1F5E8C", fontWeight: 700 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <h2 style={h2Style}>Qué no se acepta</h2>
            <ul className="mb-8 mt-2" style={{ listStyle: "none", padding: 0, margin: "8px 0 32px" }}>
              {entry.rejected.map((item) => (
                <li key={item} className="flex gap-2.5 mb-2.5" style={{ color: "#6E6557", lineHeight: 1.55, fontSize: 15 }}>
                  <span aria-hidden style={{ color: "#B4563C", fontWeight: 700 }}>✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div
              className="mt-10 p-6 md:p-8 text-center"
              style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#fff" }}
            >
              <p className="text-[15px] mb-4" style={{ color: "#2B2723", fontWeight: 600 }}>
                Registra donaciones de {entry.label.toLowerCase()} con Araguaney
              </p>
              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <CtaLink
                  href="/login"
                  ctaLabel={`necesidades_${entry.slug}_final`}
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  Empezar ahora
                </CtaLink>
                <Link
                  href="/necesidades"
                  className="inline-flex items-center justify-center px-5 py-2.5"
                  style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", fontWeight: 600, fontSize: 14, borderRadius: 99 }}
                >
                  Ver todo lo que falta
                </Link>
              </div>
              <p className="text-[13px] mt-4" style={{ color: "#6E6557" }}>
                <Link href="/guias/que-se-puede-donar" style={{ color: "#1F5E8C", fontWeight: 600 }}>
                  Guía completa: qué se puede donar →
                </Link>
              </p>
            </div>
          </div>
        </article>

        <HomeFooter dict={dict.footer} />
      </div>
    </>
  )
}

const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-source-serif)",
  fontWeight: 600,
  fontSize: 21,
  color: "#2B2723",
  margin: "32px 0 12px",
}
