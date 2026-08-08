"use client"

import Link from "next/link"
import type { IconComponent } from "@/lib/nav-config"

/* La acción principal de una pantalla, en la esquina de su encabezado.
 *
 * Con texto, en un teléfono, el botón compite por ancho con el título y se
 * parte en dos líneas: "+ Nuevo" arriba y "tipo" abajo. No es solo feo — un
 * botón de dos renglones desplaza el título y descuadra toda la cabecera.
 *
 * Debajo de `sm` queda solo el icono, en un cuadrado que cumple el mínimo
 * táctil. Desde `sm` vuelve el texto. La etiqueta **nunca desaparece**: viaja en
 * `aria-label` y en `title`, así que un lector de pantalla la anuncia igual y
 * quien pasa el cursor la ve. Un icono sin nombre accesible es un botón que
 * para algunas personas no existe.
 */

/** Mínimo táctil. Un `+` de 18 px con padding se queda en 34 y se falla con el
 * pulgar en movimiento. */
const CUADRADO = "h-11 w-11 sm:h-auto sm:w-auto"

type Variante = "primaria" | "destacada"

const ESTILO: Record<Variante, string> = {
  // Azul: crear algo. Es la acción de la pantalla, no la del flujo.
  primaria: "bg-[var(--blue)] text-white",
  // Dorado: el paso siguiente del flujo operativo.
  destacada: "bg-[var(--gold)] text-[#3B2A00]",
}

interface Comun {
  icon: IconComponent
  label: string
  variant?: Variante
  disabled?: boolean
}

type PageActionProps = Comun & (
  | { href: string; onClick?: never }
  | { onClick: () => void; href?: never }
)

export function PageAction({
  icon: Icon,
  label,
  variant = "primaria",
  disabled,
  href,
  onClick,
}: PageActionProps) {
  const clases =
    `inline-flex shrink-0 items-center justify-center gap-2 rounded-lg ${CUADRADO} ` +
    `sm:px-4 sm:py-2 text-sm font-medium ${ESTILO[variant]} ` +
    `hover:opacity-90 disabled:opacity-60`

  const contenido = (
    <>
      <Icon size={18} />
      {/* El texto solo existe desde `sm`; abajo lo sustituye el nombre
          accesible, no la nada. */}
      <span className="hidden sm:inline whitespace-nowrap">{label}</span>
    </>
  )

  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={clases}>
        {contenido}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={clases}>
      {contenido}
    </button>
  )
}
