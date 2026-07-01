import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const session = req.auth
  const isLoggedIn = !!session
  const centerRole = session?.centerRole ?? null
  const platformRole = session?.platformRole ?? null

  const { pathname } = req.nextUrl

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register")
  const isDashboard = pathname.startsWith("/dashboard")
  const isStudio = pathname.startsWith("/studio")
  const isAdminOnly = pathname.startsWith("/dashboard/centers") || pathname.startsWith("/dashboard/admin")

  // Redirect unauthenticated users away from protected areas
  if ((isDashboard || isStudio) && !isLoggedIn) {
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url))
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Studio is superadmin-only
  if (isStudio && platformRole !== "superadmin") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // national_admin-only dashboard routes
  if (isAdminOnly && centerRole !== "national_admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/studio/:path*", "/login", "/register"],
}
