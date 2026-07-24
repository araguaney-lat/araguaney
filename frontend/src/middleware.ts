import { auth } from "@/auth"
import { NextResponse, type NextRequest } from "next/server"
import {
  type Locale,
  LOCALES,
  DEFAULT_LOCALE,
  isLocale,
  ROUTE_SLUGS,
  ROUTE_KEYS,
  resolveSlug,
  canonicalSlug,
  localizedPath,
} from "@/lib/routes"

// The panel/studio are NOT in the public slug map (sub-3): they keep the same
// slug and only take a locale PREFIX (/en/dashboard/...). ES stays unprefixed.
const LOCALE_COOKIE = "locale"
const PANEL_PREFIX = /^\/en(?=\/dashboard(?:\/|$)|\/studio(?:\/|$))/

// ── i18n: map public URLs onto the app/[lang] tree ────────────────────────────
// - default locale (es) is unprefixed; others are prefixed (/en/...).
// - slugs are translated per locale via ROUTE_SLUGS.
// - only migrated keys are handled; anything else returns null (falls through to
//   the flat page or the auth logic below).
function handleI18n(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl
  const segments = pathname.split("/").filter(Boolean)

  // Detect an explicit locale prefix.
  const hasPrefix = segments.length > 0 && isLocale(segments[0])
  const urlLocale: Locale = hasPrefix ? (segments[0] as Locale) : DEFAULT_LOCALE
  const slug = (hasPrefix ? segments.slice(1) : segments).join("/")

  // Canonical case: the slug matches the requested locale's slug for a route.
  const key = resolveSlug(urlLocale, slug)
  if (key !== null) {
    const canon = canonicalSlug(key)
    const target = canon ? `/${urlLocale}/${canon}` : `/${urlLocale}`
    // Clone nextUrl and change ONLY the pathname so the query string survives
    // (e.g. the ?token=… on /registrar-centro/confirmar). Building the target with
    // `new URL(target, req.url)` would drop the search params.
    const url = req.nextUrl.clone()
    url.pathname = target
    const res = NextResponse.rewrite(url)
    res.headers.set("x-locale", urlLocale)
    return res
  }

  // Non-canonical: the slug exists but under a different locale/prefix →
  // 308-redirect to its canonical localized URL (honoring the prefix intent).
  for (const k of ROUTE_KEYS) {
    for (const l of LOCALES) {
      if (slug !== "" && ROUTE_SLUGS[k][l] === slug) {
        const targetLocale = hasPrefix ? urlLocale : l
        const dest = new URL(localizedPath(k, targetLocale), req.url)
        dest.search = req.nextUrl.search // carry ?token=… across the redirect too
        return NextResponse.redirect(dest, 308)
      }
    }
  }

  return null
}

const runAuth = auth((req) => {
  const session = req.auth
  // A NextAuth session can outlive the backend access token (24h, no refresh
  // token). Treat an expired-token session as logged-out so the user is bounced
  // to /login instead of sitting on a broken dashboard with a 401'd token.
  const isExpired =
    !!session &&
    (session.error === "AccessTokenExpired" ||
      (!!session.accessTokenExpires && Date.now() >= session.accessTokenExpires))
  const isLoggedIn = !!session && !isExpired
  const centerRole = session?.centerRole ?? null
  const platformRole = session?.platformRole ?? null
  const { pathname } = req.nextUrl

  // Panel URL-locale (sub-3): strip an /en prefix that precedes a panel route so
  // the auth checks run against the physical path. The prefix is the source of
  // truth for the locale; a bare (unprefixed) path keeps the cookie-based locale.
  const hasPanelPrefix = PANEL_PREFIX.test(pathname)
  const locale: Locale = hasPanelPrefix ? "en" : DEFAULT_LOCALE
  const logical = hasPanelPrefix ? pathname.replace(PANEL_PREFIX, "") : pathname
  // Re-apply the current prefix to an in-panel redirect target so navigation
  // stays inside the same locale.
  const withPrefix = (p: string) =>
    hasPanelPrefix && (p.startsWith("/dashboard") || p.startsWith("/studio")) ? `/en${p}` : p

  const isAuthPage = logical.startsWith("/login") || logical.startsWith("/register")
  const isDashboard = logical.startsWith("/dashboard")
  const isStudio = logical.startsWith("/studio")
  const isAdminOnly =
    logical.startsWith("/dashboard/centers") || logical.startsWith("/dashboard/admin")

  if ((isDashboard || isStudio) && !isLoggedIn) {
    const url = new URL("/login", req.url)
    if (isExpired) {
      // Surface a "your session expired" notice instead of a silent bounce.
      url.searchParams.set("expired", "1")
    } else {
      // Preserve the prefixed pathname so post-login returns to the EN URL.
      url.searchParams.set("callbackUrl", pathname)
    }
    return NextResponse.redirect(url)
  }
  if (isAuthPage && isLoggedIn) {
    // Landing honors the cookie so a returning EN user lands on /en/dashboard.
    const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value
    const landing = cookieLocale === "en" ? "/en/dashboard" : "/dashboard"
    return NextResponse.redirect(new URL(landing, req.url))
  }
  if (isStudio && platformRole !== "superadmin") {
    return NextResponse.redirect(new URL(withPrefix("/dashboard"), req.url))
  }
  if (isAdminOnly && centerRole !== "national_admin") {
    return NextResponse.redirect(new URL(withPrefix("/dashboard"), req.url))
  }

  // Prefixed panel route: rewrite to the physical path, force EN for this render,
  // and sync the cookie so unprefixed in-panel links keep the same locale.
  let res: NextResponse
  if (hasPanelPrefix) {
    const url = req.nextUrl.clone()
    url.pathname = logical
    res = NextResponse.rewrite(url)
    res.headers.set("x-locale", locale)
    res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 })
  } else {
    res = NextResponse.next()
  }
  // Authenticated shells must never be restored from the browser's back/forward
  // cache — otherwise a user whose session expired could still see the old
  // dashboard by pressing "back". no-store disables bfcache for these routes,
  // forcing a fresh request that re-runs this auth check.
  if (isDashboard || isStudio) {
    res.headers.set("Cache-Control", "no-store, must-revalidate")
  }
  return res
})

export default function middleware(req: NextRequest, ctx: unknown) {
  const i18n = handleI18n(req)
  if (i18n) return i18n
  // Delegate to the NextAuth middleware for protected/auth routes.
  return (runAuth as unknown as (r: NextRequest, c: unknown) => Response)(req, ctx)
}

export const config = {
  // Auth routes + the migrated public i18n routes (and their EN-prefixed forms).
  // Extend the public list as more routes migrate (subs 2–4).
  matcher: [
    "/dashboard/:path*",
    "/studio/:path*",
    "/login",
    "/register",
    "/",
    "/centro-de-acopio",
    "/collection-center",
    "/registrar-centro",
    "/registrar-centro/:path*",
    "/register-center",
    "/register-center/:path*",
    "/ayuda-humanitaria",
    "/humanitarian-aid",
    "/como-funciona",
    "/how-it-works",
    "/aviso-de-privacidad",
    "/privacy",
    "/terminos",
    "/terms",
    "/contacto",
    "/contact",
    "/guias",
    "/guias/:path*",
    "/guides",
    "/guides/:path*",
    "/glosario",
    "/glossary",
    "/necesidades",
    "/necesidades/:path*",
    "/needs",
    "/needs/:path*",
    "/en/:path*",
  ],
}
