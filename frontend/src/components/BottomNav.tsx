"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Menu, X, LogOut } from "lucide-react"
import { LogoutForm } from "@/components/LogoutForm"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { CenterSelector } from "@/components/CenterSelector"
import type { CenterRole } from "@/types"
import type { Locale } from "@/lib/i18n"
import type { Theme } from "@/lib/theme"
import {
  ADMIN_ITEMS,
  getMobilePrimaryItems,
  getMobileOverflowItems,
  type DashboardNav,
  type DashboardRoleLabels,
} from "@/lib/nav-config"

interface BottomNavProps {
  centerRole: CenterRole | null
  centerSelectorToken?: string | null
  nav: DashboardNav
  roleLabels: DashboardRoleLabels
  userName?: string | null
  userEmail?: string | null
  userAvatarUrl?: string | null
  locale: Locale
  theme: Theme
}

export function BottomNav({
  centerRole,
  centerSelectorToken,
  nav,
  roleLabels,
  userName,
  userEmail,
  userAvatarUrl,
  locale,
  theme,
}: BottomNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const primaryItems = getMobilePrimaryItems(centerRole)
  const overflowItems = getMobileOverflowItems(centerRole)
  const visibleAdminItems = ADMIN_ITEMS.filter((item) => centerRole && item.roles.includes(centerRole))

  return (
    <>
      {/* Fixed bottom tab bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 flex md:hidden print:hidden items-stretch justify-around border-t border-sideB bg-side"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {primaryItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          const badge = item.badgeKey === "messages" ? unreadMessages : 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${isActive ? "text-sActTx" : "text-sTx"}`}
            >
              <span className="relative">
                <Icon size={20} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span className="truncate max-w-full">{nav[item.labelKey]}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-sTx"
        >
          <Menu size={20} />
          <span>{nav.menu}</span>
        </button>
      </nav>

      {/* Bottom sheet overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[60] md:hidden bg-black/45"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom sheet panel */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[70] md:hidden flex flex-col rounded-t-2xl border-t border-cardB bg-card max-h-[80vh] overflow-y-auto"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.26s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <span className="text-sm font-semibold text-tx">{nav.menu}</span>
          <button onClick={() => setOpen(false)} className="p-1 text-fnt hover:text-tx" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-3 py-2">
          {overflowItems.length > 0 && (
            <div className="pt-1">
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-sec">
                {nav.ops_section}
              </p>
              {overflowItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium text-tx hover:bg-card2"
                  >
                    <Icon size={17} />
                    <span>{nav[item.labelKey]}</span>
                  </Link>
                )
              })}
            </div>
          )}

          {visibleAdminItems.length > 0 && (
            <div className="pt-2">
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-sec">
                {nav.admin_section}
              </p>
              {visibleAdminItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium text-tx hover:bg-card2"
                  >
                    <Icon size={17} />
                    <span>{nav[item.labelKey]}</span>
                  </Link>
                )
              })}
            </div>
          )}

          {centerRole === "national_admin" && centerSelectorToken && (
            <div className="pt-2 px-2">
              <CenterSelector token={centerSelectorToken} />
            </div>
          )}
        </div>

        <div className="border-t border-line px-3 py-3 space-y-1">
          <div className="flex items-center gap-2 px-1">
            <ThemeToggle theme={theme} />
            <LanguageSwitcher locale={locale} />
          </div>

          {(userName || userEmail) && (
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-card2"
            >
              <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[var(--gold)] text-xs font-bold text-[#3B2A00]">
                {userAvatarUrl ? (
                  <Image src={userAvatarUrl} alt="" width={28} height={28} className="h-full w-full object-cover" />
                ) : (
                  (userName ?? userEmail ?? "?")[0].toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-tx truncate">{userName ?? userEmail}</p>
                {centerRole && (
                  <p className="text-xs text-mut truncate">
                    {roleLabels[centerRole as keyof DashboardRoleLabels] ?? centerRole}
                  </p>
                )}
              </div>
            </Link>
          )}

          <LogoutForm>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-tx hover:bg-card2"
            >
              <LogOut size={17} className="flex-shrink-0" />
              <span>{nav.logout}</span>
            </button>
          </LogoutForm>
        </div>
      </div>
    </>
  )
}
