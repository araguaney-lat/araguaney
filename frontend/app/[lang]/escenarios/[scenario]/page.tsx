import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { type Locale, type RouteKey, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { breadcrumbSchema, type Schema } from "@/lib/structured-data"
import { findScenario } from "@/lib/scenarios"
import { findNeedsCategory } from "@/lib/needs-categories"

// ISR (revalidate 300), no generateStaticParams — evergreen fixed content, and
// mirrors /necesidades/[category] to avoid a build-time hang.
export const revalidate = 300

const UI: Record<Locale, { eyebrow: string; needsCta: string; howH2: string; finalCta: string; crossPillar: string; crossNeeds: string; crumbHome: string; crumbPillar: string; ogEyebrow: string }> = {
  es: {
    eyebrow: "Escenario",
    needsCta: "Ver disponibilidad y reglas",
    howH2: "Cómo ayuda Araguaney",
    finalCta: "Sumar mi centro de acopio",
    crossPillar: "Araguaney para cualquier ayuda humanitaria →",
    crossNeeds: "Ver qué falta ahora en los centros →",
    crumbHome: "Inicio",
    crumbPillar: "Ayuda humanitaria",
    ogEyebrow: "Escenario",
  },
  en: {
    eyebrow: "Scenario",
    needsCta: "See availability and rules",
    howH2: "How Araguaney helps",
    finalCta: "Add my collection center",
    crossPillar: "Araguaney for any humanitarian aid →",
    crossNeeds: "See what's needed now across centers →",
    crumbHome: "Home",
    crumbPillar: "Humanitarian aid",
    ogEyebrow: "Scenario",
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale; scenario: string }>
}): Promise<Metadata> {
  const { lang, scenario } = await params
  const entry = findScenario(scenario)
  if (!entry) {
    return { title: "404", robots: { index: false, follow: false } }
  }
  const key = `escenarios/${entry.slug}` as RouteKey
  const c = entry[lang]
  const ogImage = ogImageUrl(c.h1, UI[lang].ogEyebrow)
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: alternates(key, lang),
    openGraph: { title: `${c.metaTitle} — Araguaney`, description: c.metaDescription, images: [ogImage] },
    twitter: { card: "summary_large_image", title: `${c.metaTitle} — Araguaney`, description: c.metaDescription, images: [ogImage] },
  }
}

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ lang: Locale; scenario: string }>
}) {
  const { lang: locale, scenario } = await params
  const entry = findScenario(scenario)
  if (!entry) notFound()

  const dict = await getDictionary(locale)
  const t = UI[locale]
  const c = entry[locale]
  const key = `escenarios/${entry.slug}` as RouteKey

  const crumbs = [
    { name: t.crumbHome, path: localizedPath("", locale) },
    { name: t.crumbPillar, path: localizedPath("ayuda-humanitaria", locale) },
    { name: c.label, path: localizedPath(key, locale) },
  ]
  const structuredData: Schema[] = [breadcrumbSchema(crumbs)]

  return (
    <>
      <JsonLd data={structuredData} />
      <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <HomeNav
          dict={dict.nav}
          locale={locale}
          localeLinks={{ es: localizedPath(key, "es"), en: localizedPath(key, "en") }}
        />
        <div className="h-[56px] md:hidden" />

        {/* ── Hero ── */}
        <div className="px-5 md:px-[46px] pt-[26px] md:pt-[64px] pb-10 md:pb-[48px]">
          <div className="max-w-[720px]">
            <div className="mb-4">
              <Breadcrumbs items={crumbs} />
            </div>
            <div
              className="text-[10.5px] md:text-[12px] mb-3"
              style={{ display: "inline-flex", alignItems: "center", gap: 7, letterSpacing: "0.1em", textTransform: "uppercase", color: "#946A00", fontWeight: 700 }}
            >
              <span style={{ width: 18, height: 1.5, background: "#906400", display: "inline-block" }} />
              {t.eyebrow}
            </div>
            <h1
              className="text-[30px] md:text-[44px] mb-4"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.3px", margin: "0 0 16px" }}
            >
              <span className="mr-2">{entry.emoji}</span>{c.h1}
            </h1>
            <p className="text-[14.5px] md:text-[17px]" style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: 600 }}>
              {c.intro}
            </p>
          </div>
        </div>

        {/* ── What's needed ── */}
        <div className="px-5 md:px-[46px] py-10 md:py-[56px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[22px] md:text-[28px] mb-6" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 24px" }}>
              {c.needsIntro}
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-4">
              {entry.needs.map((need) => {
                const cat = findNeedsCategory(need.categorySlug)
                if (!cat) return null
                const catKey = `necesidades/${need.categorySlug}` as RouteKey
                return (
                  <li key={need.categorySlug} className="flex gap-3 items-start">
                    <span className="text-[22px] flex-none leading-none mt-0.5">{cat.emoji}</span>
                    <div>
                      <Link href={localizedPath(catKey, locale)} style={{ color: "#1F5E8C", fontWeight: 700, fontSize: 15.5 }}>
                        {cat[locale].label}
                      </Link>
                      <p className="text-[14px]" style={{ margin: "2px 0 0", color: "#6E6557", lineHeight: 1.55 }}>
                        {need.why[locale]}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* ── How Araguaney helps ── */}
        <div className="px-5 md:px-[46px] py-10 md:py-[56px]" style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}>
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[22px] md:text-[28px] mb-4" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}>
              {t.howH2}
            </h2>
            <p className="text-[14.5px] md:text-[16px]" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.howHelps}
            </p>
          </div>
        </div>

        {/* ── Final CTA + cross-links ── */}
        <div className="px-5 md:px-[46px] py-12 md:py-[64px] text-center" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <CtaLink
            href={localizedPath("registrar-centro", locale)}
            ctaLabel={`escenario_${entry.slug}`}
            className="inline-flex items-center justify-center px-[26px] py-[14px] mb-4"
            style={{ background: "#1F5E8C", color: "#fff", fontWeight: 600, fontSize: 15, borderRadius: 99, boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)" }}
          >
            {t.finalCta}
          </CtaLink>
          <p className="text-[13.5px] mb-2" style={{ color: "#6E6557" }}>
            <Link href={localizedPath("ayuda-humanitaria", locale)} style={{ color: "#1F5E8C", fontWeight: 600 }}>
              {t.crossPillar}
            </Link>
          </p>
          <p className="text-[13.5px]" style={{ color: "#6E6557" }}>
            <Link href={localizedPath("necesidades", locale)} style={{ color: "#1F5E8C", fontWeight: 600 }}>
              {t.crossNeeds}
            </Link>
          </p>
        </div>

        <HomeFooter dict={dict.footer} locale={locale} />
      </div>
    </>
  )
}
