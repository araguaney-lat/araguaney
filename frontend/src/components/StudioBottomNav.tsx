"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  BarChart2,
  Inbox,
  LogOut,
  MailWarning,
  Menu,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react"
import { LogoutForm } from "@/components/LogoutForm"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import type { StudioNav } from "@/components/StudioSidebar"
import type { Locale } from "@/lib/i18n"

/* Menú de Studio en móvil, con la misma forma que el del panel operativo.
 *
 * Antes la barra lateral se encogía a un riel de iconos: cabía, pero se sentía
 * un escritorio apretado. Una barra abajo es lo que la mano espera en un
 * teléfono, y además pone lo más usado al alcance del pulgar.
 *
 * Siete secciones no caben en una barra: cuatro van fijas y el resto vive
 * detrás de "Menú", igual que en el panel. **Las cuatro fijas son las que hoy
 * funcionan.** `/studio/users`, `/studio/audit` y `/studio/settings` son
 * marcadores de "Próximamente", y darles un lugar permanente en la barra sería
 * ofrecer cuatro veces al día algo que no hace nada.
 */

type Item = { href: string; labelKey: keyof StudioNav; icon: React.ComponentType<{ size?: number }> }

const PRINCIPALES: Item[] = [
  { href: "/studio", labelKey: "metrics", icon: BarChart2 },
  { href: "/studio/center-applications", labelKey: "center_applications", icon: Inbox },
  { href: "/studio/emails", labelKey: "emails", icon: MailWarning },
  { href: "/studio/ai", labelKey: "ai", icon: Sparkles },
]

const RESTO: Item[] = [
  { href: "/studio/users", labelKey: "users", icon: Users },
  { href: "/studio/audit", labelKey: "audit", icon: ScrollText },
  { href: "/studio/settings", labelKey: "settings", icon: Settings },
]

interface StudioBottomNavProps {
  nav: StudioNav
  locale: Locale
  userName?: string | null
  userEmail?: string | null
}

export function StudioBottomNav({ nav, locale, userName, userEmail }: StudioBottomNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 flex md:hidden print:hidden items-stretch justify-around border-t border-blue-200 bg-blue-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {PRINCIPALES.map((item) => {
          // `/studio` coincide con todo lo que cuelga de él: solo es exacta.
          const activo = item.href === "/studio" ? pathname === item.href : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${
                activo ? "text-blue-800" : "text-blue-600"
              }`}
            >
              <Icon size={20} />
              <span className="truncate max-w-full px-0.5">{nav[item.labelKey]}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-blue-600"
        >
          <Menu size={20} />
          <span>{nav.menu}</span>
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden bg-black/45" onClick={() => setOpen(false)} />
      )}

      <div
        className="fixed left-0 right-0 bottom-0 z-[70] md:hidden flex flex-col rounded-t-2xl border-t border-zinc-200 bg-white max-h-[80vh] overflow-y-auto"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.26s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 pt-4 pb-3">
          <span className="text-sm font-semibold text-zinc-900">{nav.menu}</span>
          <button onClick={() => setOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-3 py-2">
          {RESTO.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <Icon size={17} />
                <span>{nav[item.labelKey]}</span>
              </Link>
            )
          })}

          <div className="mt-2 border-t border-zinc-100 pt-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <span>← {nav.back_to_dashboard}</span>
            </Link>
            <div className="px-2.5 py-2">
              <LanguageSwitcher locale={locale} />
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-100 px-5 py-3">
          {(userName || userEmail) && (
            <p className="mb-2 truncate text-xs text-zinc-500">
              {userName ?? userEmail} · {nav.superadmin}
            </p>
          )}
          <LogoutForm>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <LogOut size={17} />
              <span>{nav.logout}</span>
            </button>
          </LogoutForm>
        </div>
      </div>
    </>
  )
}
