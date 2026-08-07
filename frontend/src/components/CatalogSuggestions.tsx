"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"

import { apiFetch } from "@/lib/api"
import type { ProductType } from "@/types"

interface Props {
  donationCode: string
  text: string
}

/**
 * Sugerencias de catálogo para un renglón de texto libre del donante.
 *
 * **La IA propone, la persona confirma.** Por eso no se piden solas al abrir la
 * pantalla: quien captura pulsa cuando las quiere. Cargarlas automáticamente
 * para cada renglón gastaría en los que se leen de un vistazo, y acostumbraría a
 * aceptar la primera opción sin mirarla, que es justo lo que degrada el catálogo.
 *
 * Si la capacidad está apagada, sin presupuesto o el proveedor no responde, la
 * respuesta llega vacía y aquí se dice sin dramatismo: la captura manual nunca
 * dependió de esto.
 */
export function CatalogSuggestions({ donationCode, text }: Props) {
  const { data: session } = useSession()
  const [suggestions, setSuggestions] = useState<ProductType[] | null>(null)
  const [loading, setLoading] = useState(false)

  const pedir = async () => {
    if (!session?.accessToken) return
    setLoading(true)
    try {
      const data = await apiFetch<ProductType[]>(
        `/v1/donations/${donationCode}/suggestions?text=${encodeURIComponent(text)}`,
        { token: session.accessToken },
      )
      setSuggestions(data)
    } catch {
      // Un fallo aquí no interrumpe nada: se muestra como "sin sugerencias".
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  if (suggestions === null) {
    return (
      <button
        type="button"
        onClick={pedir}
        disabled={loading}
        className="text-xs text-[var(--blue)] hover:underline disabled:opacity-50"
      >
        {loading ? "Buscando…" : "Sugerir producto"}
      </button>
    )
  }

  if (suggestions.length === 0) {
    return (
      <p className="text-xs text-fnt">
        Sin sugerencias. Busca el producto en el catálogo o créalo.
      </p>
    )
  }

  return (
    <ul className="flex flex-wrap gap-1">
      {suggestions.map((pt) => (
        <li
          key={pt.id}
          className="rounded-full bg-chip px-2 py-0.5 text-xs text-tx"
          title={pt.category}
        >
          {pt.display_name}
        </li>
      ))}
    </ul>
  )
}
