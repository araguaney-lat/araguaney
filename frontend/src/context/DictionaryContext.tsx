"use client"

import { createContext, useContext } from "react"
import type { Dictionary, Locale } from "@/lib/i18n"

/* El diccionario viaja con su locale.
 *
 * Sin él, un componente cliente que necesita formatear una fecha o un número
 * cae en el idioma del dispositivo, que no tiene por qué ser el que la persona
 * eligió en el panel. Media pantalla en español y las fechas en el formato de
 * otro país es peor que estar entero en un idioma. */
interface DictionaryValue {
  dict: Dictionary
  locale: Locale
}

const DictionaryContext = createContext<DictionaryValue | null>(null)

export function DictionaryProvider({
  dict,
  locale,
  children,
}: {
  dict: Dictionary
  locale: Locale
  children: React.ReactNode
}) {
  return (
    <DictionaryContext.Provider value={{ dict, locale }}>{children}</DictionaryContext.Provider>
  )
}

function useDictionaryValue(): DictionaryValue {
  const ctx = useContext(DictionaryContext)
  if (!ctx) throw new Error("useDict must be used inside DictionaryProvider")
  return ctx
}

export function useDict(): Dictionary {
  return useDictionaryValue().dict
}

/** El idioma elegido en el panel. Para fechas, números y todo lo que
 * `toLocaleString` decide por su cuenta si nadie se lo dice. */
export function useLocale(): Locale {
  return useDictionaryValue().locale
}
