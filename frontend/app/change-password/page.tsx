"use client"

import Image from "next/image"
import Link from "next/link"
import { useActionState } from "react"
import { changePasswordAction } from "@/lib/actions"
import { useDict } from "@/context/DictionaryContext"

const LOGO = "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#52493D",
  marginBottom: 6,
} as const

const inputStyle = {
  display: "block",
  width: "100%",
  height: 46,
  background: "#fff",
  border: "1.5px solid #E6DCC8",
  borderRadius: 10,
  padding: "0 14px",
  fontSize: 14,
  color: "#2B2723",
  outline: "none",
} as const

export default function ChangePasswordPage() {
  const dict = useDict()
  const t = dict.auth.change_password
  const [state, formAction, isPending] = useActionState(changePasswordAction, null)

  return (
    <div style={{ minHeight: "100vh", background: "#FBF7EE", display: "flex", flexDirection: "column" }}>
      {/* Brand header */}
      <header style={{ background: "#FBF7EE", borderBottom: "1px solid #EFE7D6" }}>
        <div className="px-5 md:px-[46px] py-[14px] md:py-5">
          <Link href="/" className="inline-flex items-center gap-[9px] md:gap-[11px]" style={{ textDecoration: "none" }}>
            <span
              className="w-8 h-8 md:w-[38px] md:h-[38px] flex items-center justify-center overflow-hidden bg-white flex-none"
              style={{ borderRadius: "50%", border: "1px solid #EADFC4" }}
            >
              <Image src={LOGO} alt="" width={34} height={34} className="object-contain" />
            </span>
            <span
              className="text-[18px] md:text-[21px]"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723" }}
            >
              Araguaney
            </span>
          </Link>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-5 py-12 md:py-20">
        <div className="w-full" style={{ maxWidth: 420 }}>
          <div
            className="px-7 py-9 md:px-10 md:py-10"
            style={{
              background: "#fff",
              border: "1px solid #EAE1CF",
              borderRadius: 20,
              boxShadow: "0 24px 48px -32px rgba(43,39,35,.28)",
            }}
          >
            <h1
              className="text-[24px] md:text-[26px]"
              style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, color: "#2B2723", margin: "0 0 6px" }}
            >
              {t.title}
            </h1>
            <p className="text-[13.5px] md:text-[14px]" style={{ color: "#6E6557", margin: "0 0 24px", lineHeight: 1.5 }}>
              {t.subtitle}
            </p>

            <form action={formAction} className="flex flex-col gap-4">
              <div>
                <label style={labelStyle}>{t.current_password}</label>
                <input name="current_password" type="password" required autoComplete="current-password" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>{t.new_password}</label>
                <input name="new_password" type="password" required minLength={8} autoComplete="new-password" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>{t.confirm_password}</label>
                <input name="confirm_password" type="password" required minLength={8} autoComplete="new-password" style={inputStyle} />
              </div>

              {state && "error" in state && state.error && (
                <p style={{ fontSize: 13, color: "#c0392b", background: "#FBEAE7", borderRadius: 10, padding: "8px 12px", margin: 0 }}>
                  {state.error as string}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: 50,
                  background: "#1F5E8C",
                  color: "#fff",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 15,
                  boxShadow: "0 14px 26px -12px rgba(31,94,140,.7)",
                  border: "none",
                  cursor: isPending ? "not-allowed" : "pointer",
                  opacity: isPending ? 0.7 : 1,
                  marginTop: 4,
                }}
              >
                {isPending ? t.saving : t.submit}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
