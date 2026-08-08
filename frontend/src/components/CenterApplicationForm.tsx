"use client"

import { useState } from "react"
import Turnstile from "react-turnstile"
import {
  submitCenterApplication,
  type SubmitResult,
} from "@/lib/center-application-actions"
import type { Locale } from "@/lib/routes"

export interface CenterCountryOption {
  code: string
  label: string
}

export interface CenterApplicationFormLabels {
  centerName: string
  centerNamePlaceholder: string
  country: string
  countryPlaceholder: string
  stateName: string
  stateNamePlaceholder: string
  address: string
  addressPlaceholder: string
  contactName: string
  contactNamePlaceholder: string
  contactEmail: string
  contactEmailPlaceholder: string
  contactPhone: string
  contactPhonePlaceholder: string
  backingOrg: string
  backingOrgPlaceholder: string
  socialUrl: string
  socialUrlPlaceholder: string
  message: string
  messagePlaceholder: string
  optional: string
  submit: string
  submitting: string
  turnstileError: string
  successTitle: string
  successBody: string
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  background: "#FCFAF4",
  border: "1.5px solid #E6DCC8",
  borderRadius: 10,
  padding: "0 14px",
  fontSize: 14,
  color: "#2B2723",
  outline: "none",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#52493D",
  marginBottom: 6,
}

interface CenterApplicationFormProps {
  labels: CenterApplicationFormLabels
  countries: CenterCountryOption[]
  locale: Locale
}

export default function CenterApplicationForm({
  labels: t,
  countries,
  locale,
}: CenterApplicationFormProps) {
  const [country, setCountry] = useState("")
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [turnstileKey, setTurnstileKey] = useState(0)

  // .trim() guards against a trailing newline in the env var value (a common
  // paste artifact) — Turnstile throws on an invalid sitekey. `?? ""` guards
  // against the var missing entirely: `undefined.trim()` would throw a
  // TypeError during render and, without an error boundary, blank the page.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ""

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) {
      setErrorMsg(t.turnstileError)
      setStatus("error")
      return
    }

    const fd = new FormData(e.currentTarget)
    const payload = {
      center_name: fd.get("center_name") as string,
      country_code: country,
      state_name: (fd.get("state_name") as string) || undefined,
      address: (fd.get("address") as string) || undefined,
      contact_name: fd.get("contact_name") as string,
      contact_email: fd.get("contact_email") as string,
      contact_phone: (fd.get("contact_phone") as string) || undefined,
      backing_org: (fd.get("backing_org") as string) || undefined,
      social_url: (fd.get("social_url") as string) || undefined,
      message: (fd.get("message") as string) || undefined,
      turnstileToken: token,
      locale,
    }

    setStatus("sending")
    const result: SubmitResult = await submitCenterApplication(payload)

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
      <div className="max-w-[520px] flex flex-col items-center justify-center py-16 text-center gap-4">
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#E9F4ED",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
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

  const optionalTag = <span style={{ color: "#A89E8C", fontWeight: 500 }}> · {t.optional}</span>

  return (
    <form onSubmit={handleSubmit} className="max-w-[520px]">
      {/* Center name */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>{t.centerName}</label>
        <input name="center_name" placeholder={t.centerNamePlaceholder} required maxLength={150} style={inputStyle} />
      </div>

      {/* Country + State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-[18px]" style={{ marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>{t.country}</label>
          <select
            name="country_code"
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={{ ...inputStyle, appearance: "auto", color: country ? "#2B2723" : "#9A907E" }}
          >
            <option value="" disabled>
              {t.countryPlaceholder}
            </option>
            {countries.map((c) => (
              <option key={c.code} value={c.code} style={{ color: "#2B2723" }}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>
            {t.stateName}
            {optionalTag}
          </label>
          <input name="state_name" placeholder={t.stateNamePlaceholder} maxLength={120} style={inputStyle} />
        </div>
      </div>

      {/* Address */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          {t.address}
          {optionalTag}
        </label>
        <input name="address" placeholder={t.addressPlaceholder} maxLength={300} style={inputStyle} />
      </div>

      {/* Contact name + email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-[18px]" style={{ marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>{t.contactName}</label>
          <input name="contact_name" placeholder={t.contactNamePlaceholder} required maxLength={120} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.contactEmail}</label>
          <input name="contact_email" type="email" placeholder={t.contactEmailPlaceholder} required maxLength={200} style={inputStyle} />
        </div>
      </div>

      {/* Phone + Backing org */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-[18px]" style={{ marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>
            {t.contactPhone}
            {optionalTag}
          </label>
          <input name="contact_phone" type="tel" placeholder={t.contactPhonePlaceholder} maxLength={40} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>
            {t.backingOrg}
            {optionalTag}
          </label>
          <input name="backing_org" placeholder={t.backingOrgPlaceholder} maxLength={150} style={inputStyle} />
        </div>
      </div>

      {/* Social URL */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          {t.socialUrl}
          {optionalTag}
        </label>
        <input name="social_url" type="url" placeholder={t.socialUrlPlaceholder} maxLength={300} style={inputStyle} />
      </div>

      {/* Message */}
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>
          {t.message}
          {optionalTag}
        </label>
        <textarea
          name="message"
          placeholder={t.messagePlaceholder}
          rows={4}
          maxLength={2000}
          style={{ ...inputStyle, height: "auto", padding: "12px 14px", lineHeight: 1.5, resize: "vertical" }}
        />
      </div>

      {/* Turnstile */}
      <div style={{ marginBottom: 16 }}>
        <Turnstile
          key={turnstileKey}
          sitekey={siteKey}
          onVerify={(tk) => setToken(tk)}
          onExpire={() => setToken(null)}
          theme="light"
        />
      </div>

      {status === "error" && (
        <p style={{ fontSize: 13, color: "#C0392B", marginBottom: 12 }}>{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        style={{
          width: "100%",
          height: 50,
          background: status === "sending" ? "#6B9EC2" : "#1F5E8C",
          color: "#fff",
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 15,
          border: "none",
          cursor: status === "sending" ? "not-allowed" : "pointer",
          boxShadow: "0 14px 26px -12px rgba(31,94,140,.7)",
        }}
      >
        {status === "sending" ? t.submitting : t.submit}
      </button>
    </form>
  )
}
