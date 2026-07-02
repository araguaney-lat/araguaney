"use client"

import Link, { type LinkProps } from "next/link"
import type { AnchorHTMLAttributes } from "react"

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

interface CtaLinkProps extends LinkProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> {
  /** Event label sent to GA4 as `cta_label` — keep it stable across A/B copy changes. */
  ctaLabel: string
}

// Tracks visit → login-intent as a GA4 custom event ("cta_click"). Accounts are
// admin-invited (CLAUDE.md §6), not self-service signup, so there is no public
// registration form to instrument — this approximates the funnel's top of
// intent instead of a true signup conversion.
export function CtaLink({ ctaLabel, onClick, children, ...props }: CtaLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        window.gtag?.("event", "cta_click", { cta_label: ctaLabel })
        onClick?.(e)
      }}
    >
      {children}
    </Link>
  )
}
