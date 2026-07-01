"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { logoutAction } from "@/lib/actions"
import type { CenterRole } from "@/types"
import {
  Home,
  Globe,
  PackagePlus,
  Package,
  Layers,
  Truck,
  ScanLine,
  Flag,
  Building2,
  MessageSquare,
  Users,
  UserCog,
  ScrollText,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Wrench,
} from "lucide-react"

type IconComponent = React.ComponentType<{ size?: number; className?: string }>

interface NavItem {
  href: string
  labelKey: keyof DashboardNav
  roles: CenterRole[]
  icon: IconComponent
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
  team: string
  settings: string
  logout: string
}

type DashboardRoleLabels = {
  national_admin: string
  coordinator: string
  volunteer: string
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "home", roles: ["national_admin", "coordinator", "volunteer"], icon: Home },
  { href: "/dashboard/national", labelKey: "national", roles: ["national_admin"], icon: Globe },
  { href: "/dashboard/intake", labelKey: "intake", roles: ["coordinator", "volunteer"], icon: PackagePlus },
  { href: "/dashboard/boxes", labelKey: "boxes", roles: ["coordinator", "volunteer"], icon: Package },
  { href: "/dashboard/pallets", labelKey: "pallets", roles: ["coordinator"], icon: Layers },
  { href: "/dashboard/shipments", labelKey: "shipments", roles: ["coordinator"], icon: Truck },
  { href: "/dashboard/scan", labelKey: "scan", roles: ["national_admin", "coordinator", "volunteer"], icon: ScanLine },
  { href: "/dashboard/campaigns", labelKey: "campaigns", roles: ["national_admin", "coordinator", "volunteer"], icon: Flag },
  { href: "/dashboard/centers", labelKey: "centers", roles: ["national_admin"], icon: Building2 },
  { href: "/dashboard/requests", labelKey: "requests", roles: ["national_admin", "coordinator", "volunteer"], icon: MessageSquare },
  { href: "/dashboard/team", labelKey: "team", roles: ["coordinator"], icon: Users },
]

interface AdminNavItem {
  href: string
  labelKey: keyof DashboardNav
  roles: CenterRole[]
  icon: IconComponent
}

const ADMIN_ITEMS: AdminNavItem[] = [
  { href: "/dashboard/admin/users", labelKey: "users", roles: ["national_admin"], icon: UserCog },
  { href: "/dashboard/admin/audit", labelKey: "audit", roles: ["national_admin"], icon: ScrollText },
]

const STORAGE_KEY = "sidebar_collapsed"

interface SidebarProps {
  centerRole: CenterRole | null
  platformRole?: string | null
  centerName?: string | null
  nav: DashboardNav
  roleLabels: DashboardRoleLabels
}

export function Sidebar({ centerRole, platformRole, centerName, nav, roleLabels }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "true") setCollapsed(true)
    setMounted(true)
  }, [])

  function toggle() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  const visibleItems = NAV_ITEMS.filter((item) => centerRole && item.roles.includes(centerRole))
  const visibleAdminItems = ADMIN_ITEMS.filter((item) => centerRole && item.roles.includes(centerRole))

  // Avoid layout shift before hydration
  const width = !mounted ? "w-56" : collapsed ? "w-14" : "w-56"

  return (
    <aside
      className={`flex h-full flex-col border-r border-amber-200 bg-amber-50 transition-all duration-200 ${width} flex-shrink-0`}
    >
      {/* Header */}
      <div className={`flex items-center border-b border-amber-100 px-3 py-3 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div className="min-w-0">
            <span className="text-sm font-semibold text-zinc-900 truncate block">Acopio</span>
            {centerName && (
              <p className="text-xs text-zinc-500 truncate">{centerName}</p>
            )}
            {centerRole === "national_admin" && (
              <span className="mt-0.5 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                {roleLabels.national_admin}
              </span>
            )}
          </div>
        )}
        <button
          onClick={toggle}
          className="flex-shrink-0 rounded-lg p-1.5 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors"
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={nav[item.labelKey]}
              icon={<Icon size={17} />}
              isActive={isActive}
              collapsed={collapsed}
            />
          )
        })}

        {visibleAdminItems.length > 0 && (
          <div className="pt-2">
            {!collapsed && (
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-amber-600/70">
                Administración
              </p>
            )}
            {collapsed && <div className="my-1 border-t border-amber-100" />}
            {visibleAdminItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={nav[item.labelKey]}
                  icon={<Icon size={17} />}
                  isActive={isActive}
                  collapsed={collapsed}
                />
              )
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-amber-100 px-2 py-2 space-y-0.5">
        {platformRole === "superadmin" && (
          <NavLink
            href="/studio"
            label="Studio"
            icon={<Wrench size={17} />}
            isActive={pathname.startsWith("/studio")}
            collapsed={collapsed}
            className="text-violet-600 hover:bg-violet-50 hover:text-violet-700 data-[active=true]:bg-violet-50 data-[active=true]:text-violet-700"
          />
        )}
        <NavLink
          href="/dashboard/settings"
          label={nav.settings}
          icon={<Settings size={17} />}
          isActive={pathname.startsWith("/dashboard/settings")}
          collapsed={collapsed}
        />
        <form action={logoutAction}>
          <button
            type="submit"
            title={collapsed ? nav.logout : undefined}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-amber-700 hover:bg-amber-100 hover:text-amber-900 transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut size={17} className="flex-shrink-0" />
            {!collapsed && <span>{nav.logout}</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}

interface NavLinkProps {
  href: string
  label: string
  icon: React.ReactNode
  isActive: boolean
  collapsed: boolean
  className?: string
}

function NavLink({ href, label, icon, isActive, collapsed, className }: NavLinkProps) {
  const base =
    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors"
  const active = "bg-amber-200/70 text-amber-900"
  const inactive = "text-amber-800 hover:bg-amber-100 hover:text-amber-900"

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      data-active={isActive}
      className={`${base} ${isActive ? active : inactive} ${collapsed ? "justify-center" : ""} ${className ?? ""}`}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}
