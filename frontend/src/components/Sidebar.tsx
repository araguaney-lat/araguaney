"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { logoutAction } from "@/lib/actions"
import type { CenterRole } from "@/types"

interface NavItem {
  href: string
  label: string
  roles: CenterRole[]
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Inicio", roles: ["national_admin", "coordinator", "volunteer"] },
  { href: "/dashboard/national", label: "Panel nacional", roles: ["national_admin"] },
  { href: "/dashboard/intake", label: "Recepción (Intake)", roles: ["coordinator", "volunteer"] },
  { href: "/dashboard/boxes", label: "Cajas", roles: ["coordinator", "volunteer"] },
  { href: "/dashboard/pallets", label: "Tarimas", roles: ["coordinator"] },
  { href: "/dashboard/shipments", label: "Envíos", roles: ["coordinator"] },
  { href: "/dashboard/scan", label: "Escanear QR", roles: ["national_admin", "coordinator", "volunteer"] },
  { href: "/dashboard/campaigns", label: "Campañas", roles: ["national_admin", "coordinator", "volunteer"] },
  { href: "/dashboard/centers", label: "Centros", roles: ["national_admin"] },
]

interface SidebarProps {
  centerRole: CenterRole | null
  centerName?: string | null
}

export function Sidebar({ centerRole, centerName }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter(
    (item) => centerRole && item.roles.includes(centerRole)
  )

  return (
    <aside className="flex h-full w-56 flex-col border-r border-zinc-200 bg-white px-3 py-4">
      <div className="mb-6 px-2">
        <span className="text-base font-semibold text-zinc-900">Acopio</span>
        {centerName && (
          <p className="mt-0.5 text-xs text-zinc-500 truncate">{centerName}</p>
        )}
        {centerRole === "national_admin" && (
          <span className="mt-1 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
            Admin Nacional
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href
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

      <form action={logoutAction} className="mt-4">
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Cerrar sesión
        </button>
      </form>
    </aside>
  )
}
