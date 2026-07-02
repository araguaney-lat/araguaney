import Link from "next/link"
import type { Metadata } from "next"
import HomeNav from "@/components/HomeNav"
import HomeFooter from "@/components/HomeFooter"
import { CtaLink } from "@/components/CtaLink"
import { getDictionary } from "@/lib/i18n"

const TITLE = "Humanitarian Aid Software"
const OG_TITLE = "Humanitarian Aid Software — Araguaney"
const DESCRIPTION =
  "Disaster relief donation software: intake, homogeneous boxes with QR codes, and an exportable manifest for any humanitarian aid scenario — earthquakes, floods, migration crises, and fires."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/humanitarian-aid", languages: { es: "/ayuda-humanitaria" } },
  openGraph: { title: OG_TITLE, description: DESCRIPTION },
  twitter: { title: OG_TITLE, description: DESCRIPTION },
}

const SCENARIOS = [
  { icon: "🌎", title: "Earthquakes", desc: "Coordinate intake and shipments across centers after a seismic event." },
  { icon: "🌊", title: "Floods", desc: "Register and classify donations as they arrive from multiple collection points." },
  { icon: "🧳", title: "Migration crises", desc: "Standardize aid inventory for displaced populations in transit." },
  { icon: "🔥", title: "Fires", desc: "Organize a fast response without losing traceability of what's donated and shipped." },
]

export default async function HumanitarianAidPage() {
  const dict = await getDictionary("en")

  return (
    <div style={{ background: "#FBF7EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <HomeNav dict={dict.nav} locale="en" localeLinks={{ es: "/ayuda-humanitaria" }} />
      <div className="h-[56px] md:hidden" />

      {/* ── Hero ── */}
      <div className="px-5 md:px-[46px] pt-[26px] md:pt-[64px] pb-10 md:pb-[56px]">
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
            Humanitarian aid
          </div>

          <h1
            className="text-[30px] md:text-[46px] mb-4"
            style={{
              fontFamily: "var(--font-source-serif)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.3px",
              margin: "0 0 16px",
            }}
          >
            Humanitarian aid software for any emergency scenario
          </h1>

          <p
            className="text-[14.5px] md:text-[17px] mb-8"
            style={{ color: "#5C5347", lineHeight: 1.6, maxWidth: 560 }}
          >
            From earthquakes to floods, migration crises, or fires: Araguaney standardizes the
            intake, packing, and shipment of in-kind donations for any aid center, in any
            emergency — it's not tied to a single event.
          </p>

          <CtaLink
            href="/login"
            ctaLabel="humanitarian_aid_hero"
            className="inline-flex items-center justify-center px-[26px] py-[14px]"
            style={{
              background: "#1F5E8C",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              boxShadow: "0 12px 24px -10px rgba(31,94,140,.6)",
              borderRadius: 99,
            }}
          >
            Get started
          </CtaLink>
        </div>
      </div>

      {/* ── Scenarios ── */}
      <div className="px-5 md:px-[46px] py-12 md:py-[64px]" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
        <div className="max-w-[880px] mx-auto">
          <h2
            className="text-[22px] md:text-[30px] mb-8 md:mb-10"
            style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 32px" }}
          >
            Built for any scenario
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {SCENARIOS.map((item) => (
              <div
                key={item.title}
                className="flex gap-4 items-start p-5"
                style={{ border: "1px solid #EEE6D4", borderRadius: 14, background: "#FCFAF4" }}
              >
                <span className="text-[26px] flex-none leading-none mt-0.5">{item.icon}</span>
                <div>
                  <h3
                    className="text-[15px] md:text-[16px] mb-1.5"
                    style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723", margin: "0 0 6px" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-[13px] md:text-[14px]" style={{ margin: 0, color: "#6E6557", lineHeight: 1.55 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── One standard ── */}
      <div className="px-5 md:px-[46px] py-10 md:py-[56px]" style={{ background: "#FBF7EE", borderTop: "1px solid #EFE7D6" }}>
        <div className="max-w-[720px] mx-auto">
          <h2
            className="text-[22px] md:text-[28px] mb-4"
            style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}
          >
            One standard, any emergency
          </h2>
          <p className="text-[14.5px] md:text-[16px]" style={{ color: "#5C5347", lineHeight: 1.65 }}>
            Araguaney isn't built for a specific disaster. It registers donations by category,
            batch, and expiry, packs them into homogeneous boxes with QR codes, and consolidates
            them into pallets and shipments with an exportable manifest — backed by recognized
            standards (WHO, IFRC/ICRC, IOM, UNSPSC, GS1) that ensure inventory quality no matter
            what kind of emergency triggered it.
          </p>
        </div>
      </div>

      {/* ── Final CTA + cross-link ── */}
      <div className="px-5 md:px-[46px] py-12 md:py-[64px] text-center" style={{ background: "#fff", borderTop: "1px solid #EFE7D6" }}>
        <h2
          className="text-[22px] md:text-[28px] mb-4"
          style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 16px" }}
        >
          Get ready before the next emergency hits
        </h2>
        <CtaLink
          href="/login"
          ctaLabel="humanitarian_aid_final"
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
          Get started
        </CtaLink>
        <p className="text-[13.5px] mb-2" style={{ color: "#8A8073" }}>
          Coordinating a donation center specifically?{" "}
          <Link href="/centro-de-acopio" style={{ color: "#1F5E8C", fontWeight: 600 }}>
            See the full standard (Spanish) →
          </Link>
        </p>
        <p className="text-[13.5px]" style={{ color: "#8A8073" }}>
          <Link href="/guias/que-se-puede-donar" style={{ color: "#1F5E8C", fontWeight: 600 }}>
            What can be donated
          </Link>
          {" · "}
          <Link href="/guias/como-preparar-carga-humanitaria-para-aduana" style={{ color: "#1F5E8C", fontWeight: 600 }}>
            Preparing cargo for customs
          </Link>
          {" (Spanish)"}
        </p>
      </div>

      <HomeFooter dict={dict.footer} />
    </div>
  )
}
