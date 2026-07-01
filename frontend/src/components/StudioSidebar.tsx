"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { logoutAction } from "@/lib/actions"
import {
  BarChart2,
  Users,
  ScrollText,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import type { Locale } from "@/lib/i18n"

const LOGO = "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"
const STORAGE_KEY = "studio_sidebar_collapsed"

type StudioNavItem = { href: string; labelKey: keyof StudioNav; exact?: boolean; icon: React.ComponentType<{ size?: number; className?: string }> }

const NAV_ITEMS: StudioNavItem[] = [
  { href: "/studio", labelKey: "metrics", exact: true, icon: BarChart2 },
  { href: "/studio/users", labelKey: "users", icon: Users },
  { href: "/studio/audit", labelKey: "audit", icon: ScrollText },
  { href: "/studio/settings", labelKey: "settings", icon: Settings },
]

export type StudioNav = {
  metrics: string
  users: string
  audit: string
  settings: string
  logout: string
  back_to_dashboard: string
  superadmin: string
  platform_admin: string
}

interface StudioSidebarProps {
  userName?: string | null
  userEmail?: string | null
  nav: StudioNav
  locale: Locale
}

export function StudioSidebar({ userName, userEmail, nav, locale }: StudioSidebarProps) {
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

  const width = !mounted ? "w-56" : collapsed ? "w-14" : "w-56"

  return (
    <aside
      className={`flex h-full flex-col border-r border-blue-200 bg-blue-50 transition-all duration-200 ${width} flex-shrink-0`}
    >
      {/* Header */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-1 border-b border-blue-100 px-2 py-3">
          <Image
            src={LOGO}
            alt="Araguaney"
            width={28}
            height={28}
            className="rounded-full object-contain"
          />
          <button
            onClick={toggle}
            className="rounded-lg p-1 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors"
            title="Expandir menú"
          >
            <PanelLeftOpen size={16} />
          </button>
          <LanguageSwitcher locale={locale} collapsed />
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-blue-100 px-3 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Image
              src={LOGO}
              alt="Araguaney"
              width={28}
              height={28}
              className="rounded-full object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <span className="text-sm font-semibold text-blue-900 truncate block">Studio</span>
              <p className="text-xs text-blue-600/70 truncate">{nav.platform_admin}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <LanguageSwitcher locale={locale} />
            <button
              onClick={toggle}
              className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors"
              title="Colapsar menú"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Back to dashboard */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <Link
            href="/dashboard"
            className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-200 transition-colors"
          >
            ← {nav.back_to_dashboard}
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const Icon = item.icon
          const label = nav[item.labelKey]
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-blue-200/70 text-blue-900"
                  : "text-blue-800 hover:bg-blue-100 hover:text-blue-900"
              }`}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-blue-100 px-2 py-2 space-y-0.5">
        {(userName || userEmail) && (
          <div
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? (userName ?? userEmail ?? undefined) : undefined}
          >
            <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-300 text-xs font-bold text-blue-900">
              {(userName ?? userEmail ?? "?")[0].toUpperCase()}
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-900 truncate">{userName ?? userEmail}</p>
                <p className="text-xs text-blue-700/80 truncate">{nav.superadmin}</p>
              </div>
            )}
          </div>
        )}

        <form action={logoutAction}>
          <button
            type="submit"
            title={collapsed ? nav.logout : undefined}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-blue-700 hover:bg-blue-100 hover:text-blue-900 transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut size={17} className="flex-shrink-0" />
            {!collapsed && <span>{nav.logout}</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
