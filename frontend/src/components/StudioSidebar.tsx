"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { LogoutForm } from "@/components/LogoutForm"
import {
  BarChart2,
  Users,
  ScrollText,
  Settings,
  Sparkles,
  LogOut,
  Inbox,
  MailWarning,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import type { Locale } from "@/lib/i18n"
import {
  STUDIO_NAV_ITEMS,
  isStudioItemActive,
  type StudioNav,
} from "@/lib/nav-config"

// Se reexporta para no romper a quien ya importaba el tipo desde aquí.
export type { StudioNav }

const LOGO = "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"
const STORAGE_KEY = "studio_sidebar_collapsed"



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

  // En móvil esta barra no se renderiza: ahí manda `StudioBottomNav`.
  const cerrada = collapsed

  function toggle() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  const width = !mounted ? "w-56" : cerrada ? "w-14" : "w-56"

  return (
    <aside
      className={`flex h-full flex-col border-r border-blue-200 bg-blue-50 transition-all duration-200 ${width} flex-shrink-0`}
    >
      {/* Header */}
      {cerrada ? (
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
      {!cerrada && (
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
        {STUDIO_NAV_ITEMS.map((item) => {
          const isActive = isStudioItemActive(pathname, item)
          const Icon = item.icon
          const label = nav[item.labelKey]
          return (
            <Link
              key={item.href}
              href={item.href}
              title={cerrada ? label : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                cerrada ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-blue-200/70 text-blue-900"
                  : "text-blue-800 hover:bg-blue-100 hover:text-blue-900"
              }`}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!cerrada && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-blue-100 px-2 py-2 space-y-0.5">
        {(userName || userEmail) && (
          <div
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${cerrada ? "justify-center" : ""}`}
            title={cerrada ? (userName ?? userEmail ?? undefined) : undefined}
          >
            <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-300 text-xs font-bold text-blue-900">
              {(userName ?? userEmail ?? "?")[0].toUpperCase()}
            </span>
            {!cerrada && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-900 truncate">{userName ?? userEmail}</p>
                <p className="text-xs text-blue-700/80 truncate">{nav.superadmin}</p>
              </div>
            )}
          </div>
        )}

        <LogoutForm>
          <button
            type="submit"
            title={cerrada ? nav.logout : undefined}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-blue-700 hover:bg-blue-100 hover:text-blue-900 transition-colors ${cerrada ? "justify-center" : ""}`}
          >
            <LogOut size={17} className="flex-shrink-0" />
            {!cerrada && <span>{nav.logout}</span>}
          </button>
        </LogoutForm>
      </div>
    </aside>
  )
}
