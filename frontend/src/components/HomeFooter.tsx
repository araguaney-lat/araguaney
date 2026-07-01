import Image from "next/image"
import type { Dictionary } from "@/lib/i18n"

const LOGO =
  "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"

interface Props {
  dict: Dictionary["footer"]
}

export default function HomeFooter({ dict }: Props) {
  return (
    <footer
      className="px-5 md:px-[46px] py-6 md:py-10 flex items-start md:items-center justify-between gap-4 flex-wrap"
      style={{ background: "#2B2723", color: "#E9E2D5" }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex items-center justify-center overflow-hidden flex-none"
          style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff" }}
        >
          <Image src={LOGO} alt="Araguaney" width={34} height={34} className="object-contain" />
        </span>
        <div>
          <div
            style={{
              fontFamily: "var(--font-source-serif)",
              fontSize: 18,
              fontWeight: 600,
              color: "#fff",
            }}
          >
            Araguaney
          </div>
          <div className="hidden md:block" style={{ fontSize: 12, color: "#A89E8C", marginTop: 2 }}>
            {dict.tagline}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#A89E8C", lineHeight: 1.55 }}>{dict.privacy}</div>
    </footer>
  )
}
