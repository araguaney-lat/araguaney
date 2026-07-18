import { ImageResponse } from "next/og"

// Branded default share card for the site. Static (no data fetch) so it's
// generated at build time. Serves as the Open Graph / Twitter image for any
// route that doesn't set its own openGraph.images in metadata (root layout and
// home page intentionally omit theirs so this card is used).
export const alt = "Araguaney — Software para centros de acopio y ayuda humanitaria"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const STANDARDS = ["WHO", "IFRC/ICRC", "IOM", "UNSPSC", "GS1"]

export default function Image() {
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
            Araguaney
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#2B2723",
              lineHeight: 1.05,
              marginBottom: 20,
              display: "flex",
            }}
          >
            Que cada donación llegue ordenada
          </div>
          <div style={{ fontSize: 30, color: "#5C5347", lineHeight: 1.35, display: "flex", maxWidth: 940 }}>
            Un mismo estándar para registrar, empacar y enviar ayuda humanitaria — con manifiesto y stock nacional en tiempo real.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {STANDARDS.map((name) => (
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
    { ...size }
  )
}
