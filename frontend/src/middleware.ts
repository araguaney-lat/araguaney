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
    const res = NextResponse.rewrite(new URL(target, req.url))
    res.headers.set("x-locale", urlLocale)
    return res
  }

  // Non-canonical: the slug exists but under a different locale/prefix →
  // 308-redirect to its canonical localized URL (honoring the prefix intent).
  for (const k of ROUTE_KEYS) {
    for (const l of LOCALES) {
      if (slug !== "" && ROUTE_SLUGS[k][l] === slug) {
        const targetLocale = hasPrefix ? urlLocale : l
        return NextResponse.redirect(new URL(localizedPath(k, targetLocale), req.url), 308)
      }
    }
  }

  return null
}

const runAuth = auth((req) => {
  const session = req.auth
  const isLoggedIn = !!session
  const centerRole = session?.centerRole ?? null
  const platformRole = session?.platformRole ?? null
  const { pathname } = req.nextUrl

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register")
  const isDashboard = pathname.startsWith("/dashboard")
  const isStudio = pathname.startsWith("/studio")
  const isAdminOnly =
    pathname.startsWith("/dashboard/centers") || pathname.startsWith("/dashboard/admin")

  if ((isDashboard || isStudio) && !isLoggedIn) {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url),
    )
  }
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }
  if (isStudio && platformRole !== "superadmin") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }
  if (isAdminOnly && centerRole !== "national_admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
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
    "/en/:path*",
  ],
}
