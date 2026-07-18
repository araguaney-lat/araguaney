import { ImageResponse } from "next/og"

// Dynamic Open Graph card: /og?title=...&eyebrow=...
// Renders a branded 1200x630 card with the page title so guides, the glossary
// and pillars each get their own share image instead of the plain logo.
// Text-only rendering of caller-supplied strings (length-capped) — no data
// fetch, no untrusted markup.

export const runtime = "nodejs"

const SIZE = { width: 1200, height: 630 }
const TITLE_MAX = 90
const EYEBROW_MAX = 32

function clamp(value: string | null, max: number, fallback: string): string {
  if (!value) return fallback
  const trimmed = value.trim().slice(0, max)
  return trimmed || fallback
}

export function GET(request: Request): ImageResponse {
  const { searchParams } = new URL(request.url)
  const title = clamp(searchParams.get("title"), TITLE_MAX, "Software para centros de acopio y ayuda humanitaria")
  const eyebrow = clamp(searchParams.get("eyebrow"), EYEBROW_MAX, "Araguaney")

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FBF7EE",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 3, background: "#906400" }} />
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 3,
              color: "#946A00",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div
          style={{
            fontSize: title.length > 55 ? 58 : 68,
            fontWeight: 700,
            color: "#2B2723",
            lineHeight: 1.08,
            display: "flex",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {["WHO", "IFRC/ICRC", "IOM", "UNSPSC", "GS1"].map((name) => (
            <div
              key={name}
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 600,
                color: "#1F5E8C",
                background: "#fff",
                border: "1px solid #EEE6D4",
                borderRadius: 999,
                padding: "10px 22px",
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      },
    },
  )
}
