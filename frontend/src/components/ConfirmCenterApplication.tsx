"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { confirmCenterApplication } from "@/lib/center-application-actions"

export interface ConfirmLabels {
  loading: string
  successTitle: string
  successBody: string
  invalidTitle: string
  invalidBody: string
  errorTitle: string
  errorBody: string
  homeCta: string
  loginCta: string
}

type State = "loading" | "success" | "invalid" | "error"

interface Props {
  token: string | null
  labels: ConfirmLabels
  homeHref: string
}

export default function ConfirmCenterApplication({ token, labels: t, homeHref }: Props) {
  const [state, setState] = useState<State>("loading")
  const ran = useRef(false)

  useEffect(() => {
    // Guard against React 18 StrictMode double-invocation in dev.
    if (ran.current) return
    ran.current = true

    if (!token) {
      setState("invalid")
      return
    }

    let active = true
    confirmCenterApplication(token).then((res) => {
      if (!active) return
      if (res.ok) setState("success")
      else if (res.code === "INVALID_TOKEN") setState("invalid")
      else setState("error")
    })
    return () => {
      active = false
    }
  }, [token])

  const content = {
    loading: { title: "", body: t.loading, tone: "#5C5347" },
    success: { title: t.successTitle, body: t.successBody, tone: "#1A7A4A" },
    invalid: { title: t.invalidTitle, body: t.invalidBody, tone: "#C0392B" },
    error: { title: t.errorTitle, body: t.errorBody, tone: "#C0392B" },
  }[state]

  return (
    <div className="max-w-[460px] w-full flex flex-col items-center text-center gap-4">
      {state === "loading" ? (
        <div
          style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #E6DCC8", borderTopColor: "#1F5E8C" }}
          className="animate-spin"
          aria-label={t.loading}
        />
      ) : (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: state === "success" ? "#E9F4ED" : "#FBEAE7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {state === "success" ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#1A7A4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
      )}

      {content.title && (
        <h1 style={{ fontFamily: "var(--font-source-serif)", fontSize: 24, fontWeight: 600, color: "#2B2723", margin: 0 }}>
          {content.title}
        </h1>
      )}
      <p style={{ fontSize: 14.5, color: "#5C5347", lineHeight: 1.6, margin: 0 }}>{content.body}</p>

      {state !== "loading" && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <Link
            href={homeHref}
            style={{ border: "1.5px solid #E6D4A6", color: "#2B2723", borderRadius: 99, fontSize: 13.5, fontWeight: 600, background: "#fff" }}
            className="px-[18px] py-[10px] inline-flex items-center"
          >
            {t.homeCta}
          </Link>
          {state === "success" && (
            <Link
              href="/login"
              style={{ background: "#1F5E8C", color: "#fff", borderRadius: 99, fontSize: 13.5, fontWeight: 600 }}
              className="px-[18px] py-[10px] inline-flex items-center"
            >
              {t.loginCta}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
