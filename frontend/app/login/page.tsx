"use client"

import { useActionState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { loginAction } from "@/lib/actions"

const LOGO = "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"
const SESSION_KEY = "araguaney_partial_token"

export default function LoginPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(loginAction, null)

  useEffect(() => {
    if (state && "requires_totp" in state && state.requires_totp) {
      sessionStorage.setItem(SESSION_KEY, (state as { partial_token: string }).partial_token)
      router.push("/login/2fa")
    }
  }, [state, router])

  return (
    <div style={{ minHeight: "100vh" }} className="flex flex-col md:grid md:grid-cols-2">

      {/* Brand panel */}
      <div style={{ background: "linear-gradient(160deg,#F3C033,#E0A100 60%,#C98A00)", position: "relative", overflow: "hidden" }}
        className="flex flex-col items-center justify-center text-center px-6 py-[44px] md:py-[54px] md:px-[50px] md:items-start md:text-left md:justify-between">
        <div style={{ position: "absolute", right: -60, bottom: -60, width: 360, height: 360, borderRadius: "50%", background: "rgba(255,255,255,.16)" }}
          className="hidden md:block" />

        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, position: "relative", textDecoration: "none" }}
          className="justify-center md:justify-start">
          <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff" }}
            className="flex items-center justify-center overflow-hidden flex-none">
            <Image src={LOGO} alt="Araguaney" width={36} height={36} className="object-contain" />
          </span>
          <span style={{ fontFamily: "var(--font-source-serif)", fontSize: 22, fontWeight: 600, color: "#3B2A00" }}>
            Araguaney
          </span>
        </Link>

        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#5C4500" }} className="md:hidden">
          Panel del centro de acopio
        </p>

        <div style={{ position: "relative" }} className="hidden md:block">
          <Image src={LOGO} alt="" width={150} height={150}
            style={{ marginBottom: 24, filter: "drop-shadow(0 12px 20px rgba(120,86,0,.25))" }} />
          <h2 style={{ fontFamily: "var(--font-source-serif)", margin: "0 0 16px", fontSize: 34, lineHeight: 1.15, fontWeight: 600, color: "#3B2A00", maxWidth: 360 }}>
            Cada caja cuenta. Cada envío llega.
          </h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#5C4500", maxWidth: 340 }}>
            Accede al panel de tu centro para registrar donaciones, sellar cajas y preparar envíos con manifiesto.
          </p>
        </div>
        <div style={{ fontSize: 12.5, color: "#6B5200", position: "relative" }} className="hidden md:block">
          Sin datos personales de donantes ni beneficiarios.
        </div>
      </div>

      {/* Form panel */}
      <div style={{ background: "#FBF7EE" }}
        className="flex flex-col justify-center px-6 py-[28px] md:py-[64px] md:px-[60px]">
        <div style={{ maxWidth: 380, width: "100%", margin: "0 auto" }}>
          <h1 style={{ fontFamily: "var(--font-source-serif)", margin: "0 0 6px", fontWeight: 600 }}
            className="text-[26px] md:text-[32px]">
            Inicia sesión
          </h1>
          <p style={{ margin: "0 0 24px", color: "#6E6557" }} className="text-[13.5px] md:text-[14.5px]">
            Accede al panel de tu centro<span className="hidden md:inline"> de acopio</span>.
          </p>

          <form action={formAction}>
            <input type="hidden" name="callbackUrl" value="/dashboard" />

            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#52493D", marginBottom: 6 }}>
              Correo electrónico
            </label>
            <input
              name="identifier"
              type="email"
              autoComplete="username"
              required
              placeholder="coordinador@centro.org"
              style={{
                display: "block", width: "100%", height: 46, background: "#fff",
                border: "1.5px solid #E6DCC8", borderRadius: 10, padding: "0 14px",
                fontSize: 14, color: "#2B2723", marginBottom: 16, outline: "none",
              }}
            />

            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#52493D", marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              style={{
                display: "block", width: "100%", height: 46, background: "#fff",
                border: "1.5px solid #E6DCC8", borderRadius: 10, padding: "0 14px",
                fontSize: 14, color: "#2B2723", marginBottom: 10, outline: "none",
              }}
            />

            <div style={{ textAlign: "right", marginBottom: 24 }}>
              <a href="#" style={{ fontSize: 12.5, color: "#1F5E8C", fontWeight: 600 }}>¿Olvidaste tu contraseña?</a>
            </div>

            {state && "error" in state && state.error && (
              <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 12 }}>
                {state.error === "email_not_verified"
                  ? "Verifica tu email antes de iniciar sesión."
                  : state.error === "account_disabled"
                  ? "Tu cuenta está desactivada."
                  : "Credenciales inválidas."}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "100%", height: 50, background: "#1F5E8C", color: "#fff",
                borderRadius: 10, fontWeight: 700, fontSize: 15,
                boxShadow: "0 14px 26px -12px rgba(31,94,140,.7)",
                border: "none", cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1, marginBottom: 18,
              }}
            >
              {isPending ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p style={{ margin: 0, fontSize: 12.5, color: "#7A7163", textAlign: "center" }}>
            ¿Tu centro aún no usa Araguaney?<br className="md:hidden" />
            {" "}<Link href="/contacto" style={{ color: "#1F5E8C", fontWeight: 600 }}>Solicita el alta</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
