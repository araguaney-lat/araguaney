import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { getDictionary } from "@/lib/i18n"
import { alternates } from "@/lib/seo"
import { type Locale, localizedPath } from "@/lib/routes"
import { JsonLd } from "@/components/JsonLd"
import { FaqSection } from "@/components/FaqSection"
import {
  SOFTWARE_APPLICATION_SCHEMA,
  ORGANIZATION_SCHEMA,
  faqSchema,
} from "@/lib/structured-data"

const LOGO =
  "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
  const { lang } = await params
  const dict = await getDictionary(lang)
  const { home_title, home_description } = dict.seo

  return {
    title: home_title,
    description: home_description,
    alternates: alternates("", lang),
    // Images omitted so the file-convention card (app/opengraph-image.tsx) is used.
    openGraph: { title: home_title, description: home_description },
    twitter: {
      card: "summary_large_image",
      title: home_title,
      description: home_description,
    },
  }
}

const STRUCTURED_DATA = [SOFTWARE_APPLICATION_SCHEMA, ORGANIZATION_SCHEMA]

// FAQ is Spanish-only, shown on the ES home; its schema is only emitted there.
const HOME_FAQ = [
  {
    q: "¿Qué es Araguaney?",
    a: "Un software gratuito para centros de acopio y ayuda humanitaria: registra donaciones en especie por ítem, las empaca en cajas homogéneas con QR, las consolida en tarimas y envíos con manifiesto exportable, y suma el stock de todos los centros en un panel nacional.",
  },
  {
    q: "¿Cuánto cuesta usar Araguaney?",
    a: "Es gratuito para centros de acopio y coordinaciones humanitarias, sin límite de cajas ni costo de licencia.",
  },
  {
    q: "¿Para qué emergencias sirve?",
    a: "Para cualquiera: sismos, inundaciones, incendios o crisis migratorias. El estándar de registro y envío es el mismo, sin importar el evento.",
  },
  {
    q: "¿Registra datos personales de donantes o beneficiarios?",
    a: "De beneficiarios, ninguno. De donantes solo si la persona quiere: la donación anónima es la norma, y quien se identifica lo hace para recibir su comprobante o para que el centro pueda contactarlo. Esos datos tienen plazo declarado y se purgan solos.",
  },
]

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang: locale } = await params
  const dict = await getDictionary(locale)

  const structuredData =
    locale === "es" ? [...STRUCTURED_DATA, faqSchema(HOME_FAQ)] : STRUCTURED_DATA

  return (
    <>
    <JsonLd data={structuredData} />
    <div
      style={{
        background: "#FBF7EE",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <HomeNav
        dict={dict.nav}
        locale={locale}
        localeLinks={{ es: localizedPath("", "es"), en: localizedPath("", "en") }}
      />

      {/* Spacer for fixed mobile nav (56px nav height) */}
      <div className="h-[56px] md:hidden" />

      {/* ── Hero ── */}
      <div
        className="grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] items-center
                   px-5 md:px-[46px] pt-[18px] md:pt-[62px] pb-8 md:pb-[56px]
                   gap-0 md:gap-[30px]"
      >
        {/* Left: copy */}
        <div>
          <div
            className="text-[10.5px] md:text-[12px]"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#946A00",
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            <span
              className="w-[18px] md:w-[24px]"
              style={{ height: 1.5, background: "#906400" }}
            />
            <span className="hidden md:inline">{dict.hero.eyebrow_desktop}</span>
            <span className="md:hidden">{dict.hero.eyebrow_mobile}</span>
          </div>

          <h1
            className="text-[33px] md:text-[54px] md:mb-[24px]"
            style={{
              fontFamily: "var(--font-source-serif)",
              margin: "0 0 16px",
              fontWeight: 600,
              letterSpacing: "-0.3px",
              lineHeight: 1.08,
            }}
          >
            {dict.hero.title}
          </h1>

          <p
            className="text-[14.5px] md:text-[17px]"
            style={{ margin: 0, lineHeight: 1.55, color: "#5C5347" }}
          >
            <span className="md:hidden">{dict.hero.desc_mobile}</span>
            <span className="hidden md:block max-w-[480px]">
              {dict.hero.desc_desktop}
            </span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col md:flex-row gap-[10px] md:gap-[13px] mt-[22px] md:mt-8">
            <CtaLink
              href="/login"
              ctaLabel="home_hero"
              className="flex items-center justify-center px-[26px] py-[14px]"
              style={{
                background: "#1F5E8C",
                color: "#fff",
                fontWeight: 600,
                fontSize: 15,
                boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)",
                borderRadius: 99,
              }}
            >
              {dict.hero.cta_login}
            </CtaLink>
            <CtaLink
              href={localizedPath("registrar-centro", locale)}
              ctaLabel="home_hero_register"
              className="flex items-center justify-center px-6 py-[14px]"
              style={{
                background: "#fff",
                border: "1.5px solid #E6D4A6",
                color: "#2B2723",
                fontWeight: 600,
                fontSize: 15,
                borderRadius: 99,
              }}
            >
              {dict.hero.cta_register}
            </CtaLink>
          </div>

          {/* Secondary text link */}
          <div className="mt-[14px] md:mt-[18px]">
            <Link
              href="#por-que"
              className="text-[14px] md:text-[15px] underline underline-offset-4"
              style={{ color: "#1F5E8C", fontWeight: 600 }}
            >
              {dict.hero.cta_why}
            </Link>
          </div>

          {/* Standards strip */}
          <div
            className="md:mt-[38px] md:pt-[22px]"
            style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #EAE1CF" }}
          >
            <div
              className="text-[10px] md:text-[11px]"
              style={{
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#6E6557",
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              <span className="md:hidden">{dict.hero.standards_label_mobile}</span>
              <span className="hidden md:inline">
                {dict.hero.standards_label_desktop}
              </span>
            </div>
            <div
              className="flex flex-wrap gap-x-[9px] gap-y-1"
              style={{ fontSize: 13, color: "#52493D", fontWeight: 600 }}
            >
              {["WHO", "IFRC/ICRC", "IOM", "UNSPSC", "GS1"].map((s, i, arr) => (
                <span key={s} className="flex items-center gap-[9px]">
                  {s}
                  {i < arr.length - 1 && (
                    <span style={{ color: "#D8C9A6" }}>·</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: illustration */}
        <div
          className="mt-[26px] md:mt-0 min-h-[200px] md:min-h-[360px]"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="w-[230px] h-[230px] md:w-[380px] md:h-[380px]"
            style={{
              position: "absolute",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 50% 45%, #FCEFC2 0%, #FBF7EE 70%)",
            }}
          />
          <Image
            src={LOGO}
            alt="Araguaney"
            width={400}
            height={400}
            priority
            sizes="(min-width: 768px) 400px, 240px"
            className="w-[240px] md:w-[400px] max-w-full"
            style={{
              position: "relative",
              filter: "drop-shadow(0 16px 26px rgba(176,125,0,.22))",
            }}
          />
        </div>
      </div>

      {/* ── Steps ── */}
      <div
        className="px-5 md:px-[46px] py-7 md:py-[54px]"
        style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}
      >
        <div className="flex items-baseline justify-between mb-5 md:mb-8">
          <h2
            className="text-[22px] md:text-[30px]"
            style={{
              fontFamily: "var(--font-source-serif)",
              margin: 0,
              fontWeight: 600,
            }}
          >
            {dict.steps.heading}
            <span className="hidden md:inline">{dict.steps.heading_suffix}</span>
          </h2>
          <span
            className="hidden md:inline"
            style={{ fontSize: 13.5, color: "#6E6557" }}
          >
            {dict.steps.subtitle}
          </span>
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-3 gap-5">
          {dict.steps.items.map((s) => (
            <div
              key={s.n}
              style={{
                padding: 26,
                border: "1px solid #EEE6D4",
                borderRadius: 14,
                background: "#FCFAF4",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-source-serif)",
                  fontSize: 26,
                  color: "#906400",
                  fontWeight: 600,
                }}
              >
                {s.n}
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-source-serif)",
                  margin: "14px 0 8px",
                  fontSize: 19,
                  fontWeight: 600,
                }}
              >
                {s.title}
              </h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#6E6557" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile list */}
        <div className="flex flex-col gap-3 md:hidden">
          {dict.steps.items.map((s) => (
            <div key={s.n} className="flex gap-[13px] items-start">
              <span
                style={{
                  fontFamily: "var(--font-source-serif)",
                  fontSize: 20,
                  color: "#906400",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {s.n}
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-source-serif)",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  {s.title}
                </div>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: 13,
                    color: "#6E6557",
                    lineHeight: 1.5,
                  }}
                >
                  {s.desc_short}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Por qué Araguaney ── */}
      <div
        id="por-que"
        className="px-5 md:px-[46px] py-12 md:py-[72px]"
        style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}
      >
        <div className="max-w-[760px] mx-auto">
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
            {dict.why.heading}
          </div>

          <h2
            className="text-[26px] md:text-[38px] mb-4 md:mb-5"
            style={{
              fontFamily: "var(--font-source-serif)",
              fontWeight: 600,
              lineHeight: 1.12,
              color: "#2B2723",
              margin: "12px 0 16px",
            }}
          >
            {dict.why.heading}
          </h2>

          <p
            className="text-[14.5px] md:text-[17px] mb-10 md:mb-14"
            style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: 580 }}
          >
            {dict.why.subtitle}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {dict.why.items.map((item) => (
              <div
                key={item.title}
                className="flex gap-4 items-start p-5 md:p-6"
                style={{
                  border: "1px solid #EEE6D4",
                  borderRadius: 14,
                  background: "#fff",
                }}
              >
                <span className="text-[26px] md:text-[30px] flex-none leading-none mt-0.5">
                  {item.icon}
                </span>
                <div>
                  <h3
                    className="text-[15px] md:text-[17px] mb-1.5"
                    style={{
                      fontFamily: "var(--font-source-serif)",
                      fontWeight: 600,
                      color: "#2B2723",
                      margin: "0 0 6px",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-[13px] md:text-[14px]"
                    style={{ margin: 0, color: "#6E6557", lineHeight: 1.55 }}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-2 md:gap-6 text-[13.5px]" style={{ fontWeight: 600 }}>
            {locale === "es" && (
              <Link href="/centro-de-acopio" style={{ color: "#1F5E8C" }}>
                {dict.why.link_centro}
              </Link>
            )}
            <Link href={locale === "es" ? "/ayuda-humanitaria" : "/humanitarian-aid"} style={{ color: "#1F5E8C" }}>
              {dict.why.link_ayuda}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Estándares ── */}
      <div
        id="estandares"
        className="px-5 md:px-[46px] py-12 md:py-[72px]"
        style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}
      >
        <div className="max-w-[760px] mx-auto">
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
            {dict.standards.heading}
          </div>

          <h2
            className="text-[26px] md:text-[38px]"
            style={{
              fontFamily: "var(--font-source-serif)",
              fontWeight: 600,
              lineHeight: 1.12,
              color: "#2B2723",
              margin: "12px 0 16px",
            }}
          >
            {dict.standards.heading}
          </h2>

          <p
            className="text-[14.5px] md:text-[17px] mb-10 md:mb-12"
            style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: 580 }}
          >
            {dict.standards.subtitle}
          </p>

          <div className="flex flex-col gap-3">
            {dict.standards.items.map((item, i) => (
              <div
                key={item.name}
                className="flex gap-4 md:gap-6 items-start p-4 md:p-5"
                style={{
                  border: "1px solid #EEE6D4",
                  borderRadius: 12,
                  background: i % 2 === 0 ? "#FCFAF4" : "#fff",
                }}
              >
                <div className="flex-none" style={{ minWidth: 72 }}>
                  <span
                    className="text-[12px] font-bold"
                    style={{ color: "#1F5E8C", letterSpacing: "0.04em" }}
                  >
                    {item.name}
                  </span>
                </div>
                <div>
                  <div
                    className="text-[13px] md:text-[14px] font-semibold mb-1"
                    style={{ color: "#2B2723" }}
                  >
                    {item.full}
                  </div>
                  <p
                    className="text-[12.5px] md:text-[13.5px]"
                    style={{ margin: 0, color: "#6E6557", lineHeight: 1.5 }}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ (solo ES — contenido sin traducir) ── */}
      {locale === "es" && (
        <div className="px-5 md:px-[46px] py-12 md:py-[56px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
          <FaqSection items={HOME_FAQ} />
        </div>
      )}

      {/* ── Guías (solo ES — contenido sin traducir) ── */}
      {locale === "es" && (
        <div
          className="px-5 md:px-[46px] py-10 md:py-12"
          style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}
        >
          <div className="max-w-[760px] mx-auto">
            <h2
              className="text-[18px] md:text-[22px] mb-4"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}
            >
              Guías
            </h2>
            <div className="flex flex-col gap-2 text-[13.5px]" style={{ fontWeight: 600 }}>
              <Link href="/como-funciona" style={{ color: "#1F5E8C" }}>
                Cómo funciona Araguaney, paso a paso →
              </Link>
              <Link href="/guias/como-organizar-un-centro-de-acopio" style={{ color: "#1F5E8C" }}>
                Cómo organizar un centro de acopio →
              </Link>
              <Link href="/guias/que-se-puede-donar" style={{ color: "#1F5E8C" }}>
                Qué se puede donar en un centro de acopio →
              </Link>
              <Link href="/guias/como-preparar-carga-humanitaria-para-aduana" style={{ color: "#1F5E8C" }}>
                Cómo preparar carga humanitaria para aduana →
              </Link>
            </div>
          </div>
        </div>
      )}

      <HomeFooter dict={dict.footer} locale={locale} />
    </div>
    </>
  )
}
