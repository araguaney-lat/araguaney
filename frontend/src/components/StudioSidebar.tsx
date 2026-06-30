"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { logoutAction } from "@/lib/actions"

const NAV = [
  { href: "/studio", label: "Hub", exact: true },
  { href: "/studio/users", label: "Usuarios" },
  { href: "/studio/campaigns", label: "Campañas" },
  { href: "/studio/centers", label: "Centros" },
  { href: "/studio/requests", label: "Solicitudes" },
  { href: "/studio/audit", label: "Auditoría" },
]

export function StudioSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-56 flex-col border-r border-zinc-200 bg-white px-3 py-4">
      <div className="mb-6 px-2">
        <Link href="/studio" className="block">
          <span className="text-base font-semibold text-zinc-900">Studio</span>
          <span className="mt-0.5 block text-xs text-zinc-500">Admin Nacional</span>
        </Link>
        <Link
          href="/dashboard"
          className="mt-2 inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-200 transition-colors"
        >
          ← Dashboard operativo
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5">
        {NAV.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 border-t border-zinc-100 pt-3">
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
