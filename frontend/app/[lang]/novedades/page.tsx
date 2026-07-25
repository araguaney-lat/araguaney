import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { getDictionary } from "@/lib/i18n"
import { ogImageUrl, alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { breadcrumbSchema } from "@/lib/structured-data"
import { CHANGELOG, tagLabel } from "@/lib/changelog"
import { formatContentDate } from "@/lib/content-dates"

const KEY = "novedades"

const UI: Record<Locale, { metaTitle: string; ogTitle: string; description: string; ogEyebrow: string; eyebrow: string; h1: string; lead: string; latestLabel: string; crumbHome: string; crumbSelf: string }> = {
  es: {
    metaTitle: "Novedades",
    ogTitle: "Novedades — Araguaney",
    description:
      "Novedades de Araguaney: las últimas mejoras del software para centros de acopio — panel nacional, manifiesto, transferencias, mensajería, reportes y más.",
    ogEyebrow: "Novedades",
    eyebrow: "Novedades",
    h1: "Novedades",
    lead: "Lo último que hemos lanzado en Araguaney. Seguimos mejorando el estándar para centros de acopio.",
    latestLabel: "Última actualización",
    crumbHome: "Inicio",
    crumbSelf: "Novedades",
  },
  en: {
    metaTitle: "What's new",
    ogTitle: "What's new — Araguaney",
    description:
      "What's new in Araguaney: the latest improvements to the collection-center software — national dashboard, manifest, transfers, messaging, reports and more.",
    ogEyebrow: "What's new",
    eyebrow: "What's new",
    h1: "What's new",
    lead: "The latest we've shipped in Araguaney. We keep improving the standard for aid collection centers.",
    latestLabel: "Last updated",
    crumbHome: "Home",
    crumbSelf: "What's new",
  },
}

const TAG_STYLE = { background: "#FBEFC9", color: "#8A6A16", border: "1px solid #EAD9B0" }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = UI[lang]
  const ogImage = ogImageUrl(t.metaTitle, t.ogEyebrow)
  return {
    title: t.metaTitle,
    description: t.description,
    alternates: alternates(KEY, lang),
    openGraph: { title: t.ogTitle, description: t.description, images: [ogImage] },
    twitter: { card: "summary_large_image", title: t.ogTitle, description: t.description, images: [ogImage] },
  }
}

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang: locale } = await params
  const dict = await getDictionary(locale)
  const t = UI[locale]

  const crumbs = [
    { name: t.crumbHome, path: localizedPath("", locale) },
    { name: t.crumbSelf, path: localizedPath(KEY, locale) },
  ]
  const structuredData = [breadcrumbSchema(crumbs)]
  const latest = CHANGELOG[0]?.date

  return (
    <>
      <JsonLd data={structuredData} />
      <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <HomeNav
          dict={dict.nav}
          locale={locale}
          localeLinks={{ es: localizedPath(KEY, "es"), en: localizedPath(KEY, "en") }}
        />
        <div className="h-[56px] md:hidden" />

        {/* ── Hero ── */}
        <div className="px-5 md:px-[46px] pt-[26px] md:pt-[56px] pb-8 md:pb-[40px]">
          <div className="max-w-[680px] mx-auto">
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
              className="text-[30px] md:text-[42px] mb-3"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.3px", margin: "0 0 12px" }}
            >
              {t.h1}
            </h1>
            <p className="text-[14.5px] md:text-[17px] mb-2" style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: 560 }}>
              {t.lead}
            </p>
            {latest && (
              <p className="text-[12.5px]" style={{ color: "#8A8073" }}>
                {t.latestLabel}: {formatContentDate(latest, locale)}
              </p>
            )}
          </div>
        </div>

        {/* ── Entries ── */}
        <div className="px-5 md:px-[46px] pb-16 md:pb-20">
          <div className="max-w-[680px] mx-auto">
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {CHANGELOG.map((entry) => {
                const c = entry[locale]
                return (
                  <li
                    key={`${entry.date}-${c.title}`}
                    className="py-6"
                    style={{ borderTop: "1px solid #EFE7D6" }}
                  >
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-[11px]" style={{ ...TAG_STYLE, borderRadius: 99, padding: "2px 9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {tagLabel(entry.tag, locale)}
                      </span>
                      <time dateTime={entry.date} className="text-[12.5px]" style={{ color: "#8A8073" }}>
                        {formatContentDate(entry.date, locale)}
                      </time>
                    </div>
                    <h2 className="text-[17px] md:text-[19px] mb-1.5" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723", margin: "0 0 6px" }}>
                      {c.title}
                    </h2>
                    <p className="text-[14px] md:text-[15px]" style={{ margin: 0, color: "#5C5347", lineHeight: 1.6 }}>
                      {c.body}
                    </p>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>

        <HomeFooter dict={dict.footer} locale={locale} />
      </div>
    </>
  )
}
