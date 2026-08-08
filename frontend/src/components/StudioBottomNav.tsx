"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { LogOut, MoreHorizontal, X } from "lucide-react"
import { LogoutForm } from "@/components/LogoutForm"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import {
  isStudioItemActive,
  studioOverflowItems,
  studioPrimaryItems,
  type StudioNav,
} from "@/lib/nav-config"
import type { Locale } from "@/lib/i18n"

/* Menú de Studio en móvil.
 *
 * La lista de secciones **no vive aquí**: sale de `nav-config`, la misma que
 * dibuja el sidebar de escritorio. Con dos listas, una sección nueva termina
 * existiendo en el escritorio y siendo inalcanzable en un teléfono, y nadie se
 * entera hasta que alguien la busca desde el andén.
 *
 * Siete secciones no caben en una barra: cuatro quedan fijas y el resto vive
 * detrás de "Más". El criterio de cuáles se fija está en `nav-config`, junto a
 * la lista.
 */

/** Alto mínimo de un objetivo táctil. Un icono de 20 px con padding puede
 * quedar en 32 y fallarse con el pulgar en movimiento. */
const ALTO_PESTANA = "min-h-[56px]"
const ALTO_FILA = "min-h-[44px]"

interface StudioBottomNavProps {
  nav: StudioNav
  locale: Locale
  userName?: string | null
  userEmail?: string | null
}

export function StudioBottomNav({ nav, locale, userName, userEmail }: StudioBottomNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const principales = studioPrimaryItems()
  const resto = studioOverflowItems()
  // Si la sección actual vive detrás de "Más", el botón se marca activo. Sin
  // esto, estando en Auditoría la barra no señala nada y parece que no
  // estuvieras en ningún sitio.
  const activoEnResto = resto.some((item) => isStudioItemActive(pathname, item))

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 flex md:hidden print:hidden items-stretch justify-around border-t border-blue-200 bg-blue-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {principales.map((item) => {
          const activo = isStudioItemActive(pathname, item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 ${ALTO_PESTANA} px-0.5 text-[10px] font-medium ${
                activo ? "text-blue-800" : "text-blue-600"
              }`}
            >
              <Icon size={20} />
              <span className="max-w-full truncate">{nav[item.labelKey]}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={nav.menu}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 ${ALTO_PESTANA} text-[10px] font-medium ${
            open || activoEnResto ? "text-blue-800" : "text-blue-600"
          }`}
        >
          <MoreHorizontal size={20} />
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
        {/* Tirador: dice sin palabras que esto es una hoja que se cierra. */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-zinc-300" />
        </div>

        <div className="flex items-center justify-between border-b border-zinc-100 px-5 pb-3">
          <span className="text-sm font-semibold text-zinc-900">{nav.menu}</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-zinc-400 hover:text-zinc-700"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-3 py-2">
          {resto.map((item) => {
            const Icon = item.icon
            const activo = isStudioItemActive(pathname, item)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 ${ALTO_FILA} rounded-xl px-3 text-sm font-medium ${
                  activo ? "bg-blue-50 text-blue-800" : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <Icon size={17} />
                <span>{nav[item.labelKey]}</span>
              </Link>
            )
          })}

          {/* Estos tres vivían solo en el sidebar, así que en un teléfono no
              había forma de cambiar de idioma, volver al panel ni salir. */}
          <div className="mt-2 border-t border-zinc-100 pt-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 ${ALTO_FILA} rounded-xl px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50`}
            >
              ← {nav.back_to_dashboard}
            </Link>
            <div className="px-3 py-2">
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
              className={`flex w-full items-center gap-3 ${ALTO_FILA} rounded-xl px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50`}
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
