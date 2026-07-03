"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { logoutAction } from "@/lib/actions"
import type { CenterRole } from "@/types"
import {
  Home,
  Globe,
  PackagePlus,
  Package,
  Layers,
  Truck,
  ArrowLeftRight,
  ScanLine,
  Flag,
  Building2,
  MessageSquare,
  MessageCircle,
  Users,
  UserCog,
  ScrollText,
  BarChart2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Wrench,
} from "lucide-react"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import type { Locale } from "@/lib/i18n"

type IconComponent = React.ComponentType<{ size?: number; className?: string }>

interface NavItem {
  href: string
  labelKey: keyof DashboardNav
  roles: CenterRole[]
  icon: IconComponent
  badgeKey?: string
}

type DashboardNav = {
  home: string
  national: string
  intake: string
  boxes: string
  pallets: string
  shipments: string
  transfers: string
  messages: string
  scan: string
  campaigns: string
  centers: string
  requests: string
  reports: string
  users: string
  audit: string
  team: string
  settings: string
  logout: string
  admin_section: string
}

type DashboardRoleLabels = {
  national_admin: string
  coordinator: string
  volunteer: string
}

const NAV_ITEMS: NavItem[] = [
  // "Inicio" is a dead redirect to /dashboard/national for national_admin
  // (see app/dashboard/page.tsx) — Panel Nacional is already their home,
  // showing both was a duplicate entry pointing at the same page.
  { href: "/dashboard", labelKey: "home", roles: ["coordinator", "volunteer"], icon: Home },
  { href: "/dashboard/national", labelKey: "national", roles: ["national_admin"], icon: Globe },
  { href: "/dashboard/intake", labelKey: "intake", roles: ["coordinator", "volunteer"], icon: PackagePlus },
  { href: "/dashboard/boxes", labelKey: "boxes", roles: ["coordinator", "volunteer"], icon: Package },
  { href: "/dashboard/pallets", labelKey: "pallets", roles: ["coordinator"], icon: Layers },
  { href: "/dashboard/shipments", labelKey: "shipments", roles: ["coordinator"], icon: Truck },
  { href: "/dashboard/transfers", labelKey: "transfers", roles: ["national_admin", "coordinator"], icon: ArrowLeftRight },
  { href: "/dashboard/messages", labelKey: "messages", roles: ["national_admin", "coordinator", "volunteer"], icon: MessageCircle, badgeKey: "messages" },
  { href: "/dashboard/scan", labelKey: "scan", roles: ["national_admin", "coordinator", "volunteer"], icon: ScanLine },
  { href: "/dashboard/campaigns", labelKey: "campaigns", roles: ["national_admin", "coordinator", "volunteer"], icon: Flag },
  { href: "/dashboard/centers", labelKey: "centers", roles: ["national_admin"], icon: Building2 },
  { href: "/dashboard/requests", labelKey: "requests", roles: ["national_admin", "coordinator", "volunteer"], icon: MessageSquare },
  { href: "/dashboard/reports", labelKey: "reports", roles: ["national_admin", "coordinator", "volunteer"], icon: BarChart2 },
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

const LOGO = "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"
const STORAGE_KEY = "sidebar_collapsed"

interface SidebarProps {
  centerRole: CenterRole | null
  platformRole?: string | null
  centerName?: string | null
  nav: DashboardNav
  roleLabels: DashboardRoleLabels
  userName?: string | null
  userEmail?: string | null
  userAvatarUrl?: string | null
  locale: Locale
}

export function Sidebar({ centerRole, platformRole, centerName, nav, roleLabels, userName, userEmail, userAvatarUrl, locale }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "true") setCollapsed(true)
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchUnread = () => {
      fetch("/api/messages/unread-count")
        .then((r) => r.ok ? r.json() : { unread: 0 })
        .then((d) => setUnreadMessages(d.unread ?? 0))
        .catch(() => {})
    }
    fetchUnread()
    intervalRef.current = setInterval(fetchUnread, 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
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
      {collapsed ? (
        <div className="flex flex-col items-center gap-1 border-b border-amber-100 px-2 py-3">
          <Image src={LOGO} alt="Araguaney" width={28} height={28} className="rounded-full object-contain" />
          <button
            onClick={toggle}
            className="rounded-lg p-1 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors"
            title="Expandir menú"
          >
            <PanelLeftOpen size={16} />
          </button>
          <LanguageSwitcher locale={locale} collapsed />
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-amber-100 px-3 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Image src={LOGO} alt="Araguaney" width={28} height={28} className="rounded-full object-contain flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-sm font-semibold text-amber-900 truncate block">Araguaney</span>
              {centerName && (
                <p className="text-xs text-amber-700/70 truncate">{centerName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <LanguageSwitcher locale={locale} />
            <button
              onClick={toggle}
              className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors"
              title="Colapsar menú"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          const badge = item.badgeKey === "messages" ? unreadMessages : 0
          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={nav[item.labelKey]}
              icon={<Icon size={17} />}
              isActive={isActive}
              collapsed={collapsed}
              badge={badge}
            />
          )
        })}

        {visibleAdminItems.length > 0 && (
          <div className="pt-2">
            {!collapsed && (
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-amber-600/70">
                {nav.admin_section}
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
        {/* User info — links to profile/settings */}
        {(userName || userEmail) && (
          <Link
            href="/dashboard/settings"
            data-active={pathname.startsWith("/dashboard/settings")}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-amber-100 data-[active=true]:bg-amber-200/70 ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? `${userName ?? userEmail}${centerRole ? ` · ${roleLabels[centerRole as keyof DashboardRoleLabels] ?? centerRole}` : ""}` : undefined}
          >
            <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-amber-300 text-xs font-bold text-amber-900">
              {userAvatarUrl ? (
                <Image src={userAvatarUrl} alt="" width={28} height={28} className="h-full w-full object-cover" />
              ) : (
                (userName ?? userEmail ?? "?")[0].toUpperCase()
              )}
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-900 truncate">{userName ?? userEmail}</p>
                {centerRole && (
                  <p className="text-xs text-amber-700/80 truncate">
                    {roleLabels[centerRole as keyof DashboardRoleLabels] ?? centerRole}
                  </p>
                )}
              </div>
            )}
          </Link>
        )}

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
  badge?: number
}

function NavLink({ href, label, icon, isActive, collapsed, className, badge = 0 }: NavLinkProps) {
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
      <span className="relative flex-shrink-0">
        {icon}
        {badge > 0 && collapsed && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-red-500" />
        )}
      </span>
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && badge > 0 && (
        <span className="ml-auto flex-shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  )
}
