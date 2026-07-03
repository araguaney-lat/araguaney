"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { totpChallengeAction } from "@/lib/actions"
import { useDict } from "@/context/DictionaryContext"

const LOGO = "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"
const SESSION_KEY = "araguaney_partial_token"

type Mode = "totp" | "backup"

export default function TwoFactorPage() {
  const router = useRouter()
  const dict = useDict()
  const t = dict.auth.totp
  const [partialToken, setPartialToken] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>("totp")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_KEY)
    if (!token) {
      router.replace("/login")
      return
    }
    setPartialToken(token)
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!partialToken || !code.trim()) return
    setLoading(true)
    setError("")
    const result = await totpChallengeAction(partialToken, code.trim())
    setLoading(false)
    if (result && "error" in result) {
      setError(result.error)
      setCode("")
      return
    }
    sessionStorage.removeItem(SESSION_KEY)
  }

  if (!partialToken) return null

  return (
    <div style={{ minHeight: "100vh", background: "#FBF7EE" }} className="flex flex-col items-center justify-center px-4">
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, textDecoration: "none" }}>
        <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#F3C033" }}
          className="flex items-center justify-center overflow-hidden flex-none">
          <Image src={LOGO} alt="" width={32} height={32} className="object-contain" />
        </span>
        <span style={{ fontFamily: "var(--font-source-serif)", fontSize: 20, fontWeight: 600, color: "#3B2A00" }}>
          Araguaney
        </span>
      </Link>

      <div style={{ background: "#fff", border: "1px solid #E6DCC8", borderRadius: 16, padding: "32px 28px", width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#EDF5FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F5E8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "var(--font-source-serif)", fontSize: 22, fontWeight: 600, color: "#1A1410", margin: "0 0 6px" }}>
            {t.title}
          </h1>
          <p style={{ fontSize: 13.5, color: "#6E6557", margin: 0 }}>
            {mode === "totp" ? t.subtitle_totp : t.subtitle_backup}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type={mode === "totp" ? "text" : "text"}
            inputMode={mode === "totp" ? "numeric" : "text"}
            maxLength={mode === "totp" ? 6 : 20}
            value={code}
            onChange={(e) => { setCode(mode === "totp" ? e.target.value.replace(/\D/g, "") : e.target.value.toUpperCase()); setError("") }}
            placeholder={mode === "totp" ? t.placeholder_totp : t.placeholder_backup}
            autoFocus
            style={{
              display: "block", width: "100%", height: 52, background: "#fff",
              border: "1.5px solid #E6DCC8", borderRadius: 10, padding: "0 14px",
              fontSize: mode === "totp" ? 26 : 16,
              fontFamily: "monospace", color: "#2B2723",
              letterSpacing: mode === "totp" ? "0.35em" : "normal",
              textAlign: "center", marginBottom: 12, outline: "none",
              boxSizing: "border-box",
            }}
          />

          {error && (
            <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 10, textAlign: "center" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "totp" ? code.length !== 6 : !code.trim())}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", height: 50, background: "#1F5E8C", color: "#fff",
              borderRadius: 10, fontWeight: 700, fontSize: 15,
              boxShadow: "0 14px 26px -12px rgba(31,94,140,.7)",
              border: "none", cursor: "pointer",
              opacity: loading || (mode === "totp" ? code.length !== 6 : !code.trim()) ? 0.7 : 1,
              marginBottom: 16,
            }}
          >
            {loading ? t.verifying : t.continue}
          </button>
        </form>

        <div style={{ textAlign: "center" }}>
          {mode === "totp" ? (
            <button
              onClick={() => { setMode("backup"); setCode(""); setError("") }}
              style={{ fontSize: 12.5, color: "#1F5E8C", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
            >
              {t.use_backup_code}
            </button>
          ) : (
            <button
              onClick={() => { setMode("totp"); setCode(""); setError("") }}
              style={{ fontSize: 12.5, color: "#1F5E8C", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
            >
              {t.use_totp_app}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
