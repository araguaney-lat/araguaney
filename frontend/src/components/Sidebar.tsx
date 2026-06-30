"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { logoutAction } from "@/lib/actions"
import type { CenterRole } from "@/types"

interface NavItem {
  href: string
  labelKey: keyof DashboardNav
  roles: CenterRole[]
}

type DashboardNav = {
  home: string
  national: string
  intake: string
  boxes: string
  pallets: string
  shipments: string
  scan: string
  campaigns: string
  centers: string
  requests: string
  users: string
  audit: string
  settings: string
  logout: string
}

type DashboardRoleLabels = {
  national_admin: string
  coordinator: string
  volunteer: string
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "home", roles: ["national_admin", "coordinator", "volunteer"] },
  { href: "/dashboard/national", labelKey: "national", roles: ["national_admin"] },
  { href: "/dashboard/intake", labelKey: "intake", roles: ["coordinator", "volunteer"] },
  { href: "/dashboard/boxes", labelKey: "boxes", roles: ["coordinator", "volunteer"] },
  { href: "/dashboard/pallets", labelKey: "pallets", roles: ["coordinator"] },
  { href: "/dashboard/shipments", labelKey: "shipments", roles: ["coordinator"] },
  { href: "/dashboard/scan", labelKey: "scan", roles: ["national_admin", "coordinator", "volunteer"] },
  { href: "/dashboard/campaigns", labelKey: "campaigns", roles: ["national_admin", "coordinator", "volunteer"] },
  { href: "/dashboard/centers", labelKey: "centers", roles: ["national_admin"] },
  { href: "/dashboard/requests", labelKey: "requests", roles: ["national_admin", "coordinator", "volunteer"] },
]

const ADMIN_ITEMS: NavItem[] = [
  { href: "/dashboard/admin/users", labelKey: "users", roles: ["national_admin"] },
  { href: "/dashboard/admin/audit", labelKey: "audit", roles: ["national_admin"] },
]

interface SidebarProps {
  centerRole: CenterRole | null
  platformRole?: string | null
  centerName?: string | null
  nav: DashboardNav
  roleLabels: DashboardRoleLabels
}

export function Sidebar({ centerRole, platformRole, centerName, nav, roleLabels }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter(
    (item) => centerRole && item.roles.includes(centerRole)
  )
  const visibleAdminItems = ADMIN_ITEMS.filter(
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
            {roleLabels.national_admin}
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
              {nav[item.labelKey]}
            </Link>
          )
        })}

        {visibleAdminItems.length > 0 && (
          <div className="pt-3">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Administración
            </p>
            {visibleAdminItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
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
                  {nav[item.labelKey]}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      <div className="mt-4 border-t border-zinc-100 pt-3 space-y-0.5">
        {platformRole === "superadmin" && (
          <Link
            href="/studio"
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/studio")
                ? "bg-violet-50 text-violet-700"
                : "text-violet-600 hover:bg-violet-50 hover:text-violet-700"
            }`}
          >
            Studio
          </Link>
        )}
        <Link
          href="/dashboard/settings"
          className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname.startsWith("/dashboard/settings")
              ? "bg-zinc-100 text-zinc-900"
              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
          }`}
        >
          {nav.settings}
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
          >
            {nav.logout}
          </button>
        </form>
      </div>
    </aside>
  )
}
