"use client"

import { useState } from "react"
import Turnstile from "react-turnstile"
import { submitContact, type ContactResult } from "@/lib/contact-actions"

const TIPOS = [
  { value: "alta", label: "Dar de alta un centro" },
  { value: "voluntario", label: "Sumarme como voluntario" },
  { value: "consulta", label: "Otra consulta" },
] as const

type Tipo = (typeof TIPOS)[number]["value"]

export default function ContactForm() {
  const [tipo, setTipo] = useState<Tipo>("alta")
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [turnstileKey, setTurnstileKey] = useState(0)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) {
      setErrorMsg("Completa la verificación de seguridad.")
      setStatus("error")
      return
    }

    const fd = new FormData(e.currentTarget)
    const payload = {
      nombre: fd.get("nombre") as string,
      organizacion: fd.get("organizacion") as string,
      correo: fd.get("correo") as string,
      tipo,
      mensaje: fd.get("mensaje") as string,
      turnstileToken: token,
    }

    setStatus("sending")
    const result: ContactResult = await submitContact(payload)

    if (result.ok) {
      setStatus("done")
    } else {
      setErrorMsg(result.error)
      setStatus("error")
      setTurnstileKey((k) => k + 1)
      setToken(null)
    }
  }

  if (status === "done") {
    return (
      <div className="max-w-[440px] flex flex-col items-center justify-center py-16 text-center gap-4">
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "#E9F4ED", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#1A7A4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{ fontFamily: "var(--font-source-serif)", fontSize: 22, fontWeight: 600, color: "#2B2723", margin: 0 }}>
          Mensaje enviado
        </h2>
        <p style={{ fontSize: 14.5, color: "#5C5347", lineHeight: 1.6, margin: 0 }}>
          Nos pondremos en contacto contigo en menos de 48 horas hábiles.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[440px]">
      {/* Nombre + Org */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-[18px] mb-4 md:mb-[18px]">
        {[
          { name: "nombre", label: "Nombre", placeholder: "Tu nombre" },
          { name: "organizacion", label: "Organización", placeholder: "Tu fundación" },
        ].map((f) => (
          <div key={f.name}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#52493D", marginBottom: 6 }}>
              {f.label}
            </label>
            <input
              name={f.name}
              placeholder={f.placeholder}
              required
              style={{ width: "100%", height: 46, background: "#FCFAF4", border: "1.5px solid #E6DCC8", borderRadius: 10, padding: "0 14px", fontSize: 14, color: "#2B2723", outline: "none" }}
            />
          </div>
        ))}
      </div>

      {/* Correo */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#52493D", marginBottom: 6 }}>
          Correo
        </label>
        <input
          name="correo"
          type="email"
          placeholder="tu@correo.org"
          required
          style={{ width: "100%", height: 46, background: "#FCFAF4", border: "1.5px solid #E6DCC8", borderRadius: 10, padding: "0 14px", fontSize: 14, color: "#2B2723", outline: "none" }}
        />
      </div>

      {/* Chips */}
      <div className="hidden md:block" style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#52493D", marginBottom: 7 }}>
          ¿Cómo podemos ayudarte?
        </label>
        <div className="flex gap-2 flex-wrap">
          {TIPOS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTipo(opt.value)}
              style={{
                fontSize: 13, padding: "8px 14px", borderRadius: 99, fontWeight: 600, cursor: "pointer",
                background: tipo === opt.value ? "#1F5E8C" : "#FCFAF4",
                color: tipo === opt.value ? "#fff" : "#52493D",
                border: tipo === opt.value ? "none" : "1.5px solid #E6DCC8",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mensaje */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#52493D", marginBottom: 6 }}>
          Mensaje
        </label>
        <textarea
          name="mensaje"
          placeholder="Cuéntanos sobre tu centro."
          rows={4}
          required
          minLength={10}
          style={{ width: "100%", background: "#FCFAF4", border: "1.5px solid #E6DCC8", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#2B2723", lineHeight: 1.5, outline: "none", resize: "vertical" }}
        />
      </div>

      {/* Turnstile */}
      <div style={{ marginBottom: 16 }}>
        <Turnstile
          key={turnstileKey}
          sitekey={siteKey}
          onVerify={(t) => setToken(t)}
          onExpire={() => setToken(null)}
          theme="light"
        />
      </div>

      {/* Error */}
      {status === "error" && (
        <p style={{ fontSize: 13, color: "#C0392B", marginBottom: 12 }}>{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        style={{
          width: "100%", height: 50, background: status === "sending" ? "#6B9EC2" : "#1F5E8C",
          color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 15, border: "none",
          cursor: status === "sending" ? "not-allowed" : "pointer",
          boxShadow: "0 14px 26px -12px rgba(31,94,140,.7)",
        }}
      >
        {status === "sending" ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  )
}
