"use client"

import { useActionState } from "react"
import Image from "next/image"
import Link from "next/link"
import { loginAction } from "@/lib/actions"

const LOGO = "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782786229/araguaney_hwthy5.png"

export default function LoginPage() {
  const [error, formAction, isPending] = useActionState(loginAction, null)

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* Brand panel */}
      <div style={{
        position: "relative",
        background: "linear-gradient(160deg,#F3C033,#E0A100 60%,#C98A00)",
        padding: "54px 50px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -60, bottom: -60, width: 360, height: 360, borderRadius: "50%", background: "rgba(255,255,255,.16)" }} />
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, position: "relative", textDecoration: "none" }}>
          <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff" }}
            className="flex items-center justify-center overflow-hidden flex-none">
            <Image src={LOGO} alt="Araguaney" width={36} height={36} className="object-contain" />
          </span>
          <span style={{ fontFamily: "var(--font-source-serif)", fontSize: 22, fontWeight: 600, color: "#3B2A00" }}>
            Araguaney
          </span>
        </Link>
        {/* Center content */}
        <div style={{ position: "relative" }}>
          <Image src={LOGO} alt="" width={150} height={150}
            style={{ marginBottom: 24, filter: "drop-shadow(0 12px 20px rgba(120,86,0,.25))" }} />
          <h2 style={{ fontFamily: "var(--font-source-serif)", margin: "0 0 16px", fontSize: 34, lineHeight: 1.15, fontWeight: 600, color: "#3B2A00", maxWidth: 360 }}>
            Cada caja cuenta. Cada envío llega.
          </h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#5C4500", maxWidth: 340 }}>
            Accede al panel de tu centro para registrar donaciones, sellar cajas y preparar envíos con manifiesto.
          </p>
        </div>
        <div style={{ position: "relative", fontSize: 12.5, color: "#6B5200" }}>
          Sin datos personales de donantes ni beneficiarios.
        </div>
      </div>

      {/* Form panel */}
      <div style={{ background: "#FBF7EE", padding: "64px 60px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ maxWidth: 380, width: "100%", margin: "0 auto" }}>
          <h1 style={{ fontFamily: "var(--font-source-serif)", margin: "0 0 10px", fontSize: 32, fontWeight: 600 }}>
            Inicia sesión
          </h1>
          <p style={{ margin: "0 0 32px", fontSize: 14.5, color: "#6E6557" }}>
            Bienvenido de vuelta al panel de tu centro de acopio.
          </p>

          <form action={formAction} className="space-y-0">
            <input type="hidden" name="callbackUrl" value="/dashboard" />

            {/* Email */}
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#52493D", marginBottom: 7 }}>
              Correo electrónico
            </label>
            <input
              name="identifier"
              type="email"
              autoComplete="username"
              required
              placeholder="coordinador@centro.org"
              style={{
                display: "block", width: "100%", height: 48, background: "#fff",
                border: "1.5px solid #E6DCC8", borderRadius: 10, padding: "0 15px",
                fontSize: 14.5, color: "#2B2723", marginBottom: 18, outline: "none",
              }}
            />

            {/* Password */}
            <div className="flex items-center justify-between" style={{ marginBottom: 7 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#52493D" }}>Contraseña</label>
              <a href="#" style={{ fontSize: 12.5, color: "#1F5E8C", fontWeight: 600 }}>¿Olvidaste tu contraseña?</a>
            </div>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••••"
              style={{
                display: "block", width: "100%", height: 48, background: "#fff",
                border: "1.5px solid #E6DCC8", borderRadius: 10, padding: "0 15px",
                fontSize: 14.5, color: "#2B2723", marginBottom: 18, outline: "none",
              }}
            />

            {error?.error && (
              <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 12 }}>
                {error.error === "email_not_verified"
                  ? "Verifica tu email antes de iniciar sesión."
                  : error.error === "account_disabled"
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
                opacity: isPending ? 0.7 : 1, marginBottom: 22,
              }}
            >
              {isPending ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <div className="flex items-center gap-[14px]" style={{ marginBottom: 22, color: "#B6AC99", fontSize: 12 }}>
            <span style={{ flex: 1, height: 1, background: "#E6DCC8" }} />
            o
            <span style={{ flex: 1, height: 1, background: "#E6DCC8" }} />
          </div>

          <button style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", height: 48, background: "#fff", border: "1.5px solid #E6DCC8",
            borderRadius: 10, fontWeight: 600, fontSize: 14, color: "#2B2723",
            cursor: "pointer", marginBottom: 26,
          }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #C9BEA9" }} />
            Continuar con Google
          </button>

          <p style={{ margin: "0 0 18px", fontSize: 13, color: "#7A7163", textAlign: "center" }}>
            ¿Tu centro aún no usa Araguaney?{" "}
            <Link href="/contacto" style={{ color: "#1F5E8C", fontWeight: 600 }}>Solicita el alta</Link>
          </p>

          <div className="flex items-center justify-center gap-2" style={{ fontSize: 11, color: "#A89E8C" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1F7A4D" }} />
            Protegido con Cloudflare Turnstile
          </div>
        </div>
      </div>
    </div>
  )
}
