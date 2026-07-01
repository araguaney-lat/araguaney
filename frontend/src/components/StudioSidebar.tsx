"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { logoutAction } from "@/lib/actions"

const NAV = [
  { href: "/studio", label: "Métricas", exact: true },
  { href: "/studio/users", label: "Usuarios" },
  { href: "/studio/audit", label: "Auditoría" },
  { href: "/studio/settings", label: "Configuración" },
]

export function StudioSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-56 flex-col border-r border-blue-200 bg-blue-50 px-3 py-4">
      <div className="mb-6 px-2">
        <Link href="/studio" className="block">
          <span className="text-base font-semibold text-blue-900">Studio</span>
          <span className="mt-0.5 block text-xs text-blue-600/70">Administración de plataforma</span>
        </Link>
        <Link
          href="/dashboard"
          className="mt-2 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-200 transition-colors"
        >
          ← Dashboard
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
                  ? "bg-blue-200/70 text-blue-900"
                  : "text-blue-800 hover:bg-blue-100 hover:text-blue-900"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 border-t border-blue-100 pt-3">
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-100 hover:text-blue-900"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
