"use client"

import { useState } from "react"
import Turnstile from "react-turnstile"
import { submitContact, type ContactResult } from "@/lib/contact-actions"

export interface ContactFormLabels {
  name: string
  namePlaceholder: string
  org: string
  orgPlaceholder: string
  email: string
  emailPlaceholder: string
  helpTitle: string
  typeAlta: string
  typeVoluntario: string
  typeConsulta: string
  message: string
  messagePlaceholder: string
  submit: string
  submitting: string
  turnstileError: string
  successTitle: string
  successBody: string
}

type Tipo = "alta" | "voluntario" | "consulta"

export default function ContactForm({ labels: t }: { labels: ContactFormLabels }) {
  const types: { value: Tipo; label: string }[] = [
    { value: "alta", label: t.typeAlta },
    { value: "voluntario", label: t.typeVoluntario },
    { value: "consulta", label: t.typeConsulta },
  ]
  const [tipo, setTipo] = useState<Tipo>("alta")
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [turnstileKey, setTurnstileKey] = useState(0)

  // .trim() guards against a trailing newline in the env var value (a common
  // paste artifact in dashboard UIs) — Turnstile throws an uncaught error on
  // an invalid sitekey, which breaks rendering for the rest of the form.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!.trim()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) {
      setErrorMsg(t.turnstileError)
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
          {t.successTitle}
        </h2>
        <p style={{ fontSize: 14.5, color: "#5C5347", lineHeight: 1.6, margin: 0 }}>
          {t.successBody}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[440px]">
      {/* Name + Org */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-[18px] mb-4 md:mb-[18px]">
        {[
          { name: "nombre", label: t.name, placeholder: t.namePlaceholder },
          { name: "organizacion", label: t.org, placeholder: t.orgPlaceholder },
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

      {/* Email */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#52493D", marginBottom: 6 }}>
          {t.email}
        </label>
        <input
          name="correo"
          type="email"
          placeholder={t.emailPlaceholder}
          required
          style={{ width: "100%", height: 46, background: "#FCFAF4", border: "1.5px solid #E6DCC8", borderRadius: 10, padding: "0 14px", fontSize: 14, color: "#2B2723", outline: "none" }}
        />
      </div>

      {/* Chips */}
      <div className="hidden md:block" style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#52493D", marginBottom: 7 }}>
          {t.helpTitle}
        </label>
        <div className="flex gap-2 flex-wrap">
          {types.map((opt) => (
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

      {/* Message */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#52493D", marginBottom: 6 }}>
          {t.message}
        </label>
        <textarea
          name="mensaje"
          placeholder={t.messagePlaceholder}
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
        {status === "sending" ? t.submitting : t.submit}
      </button>
    </form>
  )
}
