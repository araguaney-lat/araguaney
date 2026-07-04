"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { logoutAction } from "@/lib/actions"
import type { CenterRole } from "@/types"
import { LogOut, PanelLeftClose, PanelLeftOpen, Wrench } from "lucide-react"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import type { Locale } from "@/lib/i18n"
import type { Theme } from "@/lib/theme"
import {
  NAV_ITEMS,
  OPS_ITEMS,
  ADMIN_ITEMS,
  type DashboardNav,
  type DashboardRoleLabels,
} from "@/lib/nav-config"

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
  theme: Theme
}

export function Sidebar({ centerRole, platformRole, centerName, nav, roleLabels, userName, userEmail, userAvatarUrl, locale, theme }: SidebarProps) {
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
  const visibleOpsItems = OPS_ITEMS.filter((item) => centerRole && item.roles.includes(centerRole))
  const visibleAdminItems = ADMIN_ITEMS.filter((item) => centerRole && item.roles.includes(centerRole))

  // Avoid layout shift before hydration
  const width = !mounted ? "w-56" : collapsed ? "w-14" : "w-56"

  return (
    <aside
      className={`flex h-full flex-col border-r border-sideB bg-side transition-all duration-200 ${width} flex-shrink-0`}
    >
      {/* Header */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-1 border-b border-sideB px-2 py-3">
          <Image src={LOGO} alt="Araguaney" width={28} height={28} className="rounded-full object-contain" />
          <button
            onClick={toggle}
            className="rounded-lg p-1 text-sTx hover:bg-sAct hover:text-sActTx transition-colors"
            title="Expandir menú"
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-sideB px-3 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Image src={LOGO} alt="Araguaney" width={28} height={28} className="rounded-full object-contain flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-sm font-semibold text-sActTx truncate block">Araguaney</span>
              {centerName && (
                <p className="text-xs text-sTx/80 truncate">{centerName}</p>
              )}
            </div>
          </div>
          <button
            onClick={toggle}
            className="rounded-lg p-1.5 text-sTx hover:bg-sAct hover:text-sActTx transition-colors flex-shrink-0"
            title="Colapsar menú"
          >
            <PanelLeftClose size={18} />
          </button>
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

        {visibleOpsItems.length > 0 && (
          <div className="pt-2">
            {!collapsed && (
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-sec">
                {nav.ops_section}
              </p>
            )}
            {collapsed && <div className="my-1 border-t border-sideB" />}
            {visibleOpsItems.map((item) => {
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
          </div>
        )}

        {visibleAdminItems.length > 0 && (
          <div className="pt-2">
            {!collapsed && (
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-sec">
                {nav.admin_section}
              </p>
            )}
            {collapsed && <div className="my-1 border-t border-sideB" />}
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
      <div className="border-t border-sideB px-2 py-2 space-y-0.5">
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
        <div className={`flex items-center gap-1 ${collapsed ? "flex-col" : ""}`}>
          <ThemeToggle theme={theme} collapsed={collapsed} />
          <LanguageSwitcher locale={locale} collapsed={collapsed} />
        </div>
        {/* User info — links to profile/settings */}
        {(userName || userEmail) && (
          <Link
            href="/dashboard/settings"
            data-active={pathname.startsWith("/dashboard/settings")}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-sAct data-[active=true]:bg-sAct ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? `${userName ?? userEmail}${centerRole ? ` · ${roleLabels[centerRole as keyof DashboardRoleLabels] ?? centerRole}` : ""}` : undefined}
          >
            <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[var(--gold)] text-xs font-bold text-[#3B2A00]">
              {userAvatarUrl ? (
                <Image src={userAvatarUrl} alt="" width={28} height={28} className="h-full w-full object-cover" />
              ) : (
                (userName ?? userEmail ?? "?")[0].toUpperCase()
              )}
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sActTx truncate">{userName ?? userEmail}</p>
                {centerRole && (
                  <p className="text-xs text-sTx/85 truncate">
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
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sTx hover:bg-sAct hover:text-sActTx transition-colors ${collapsed ? "justify-center" : ""}`}
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
  const active = "bg-sAct text-sActTx"
  const inactive = "text-sTx hover:bg-sAct hover:text-sActTx"

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
