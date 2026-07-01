"use client"

import { createContext, useContext } from "react"
import type { Dictionary } from "@/lib/i18n"

const DictionaryContext = createContext<Dictionary | null>(null)

export function DictionaryProvider({
  dict,
  children,
}: {
  dict: Dictionary
  children: React.ReactNode
}) {
  return (
    <DictionaryContext.Provider value={dict}>{children}</DictionaryContext.Provider>
  )
}

export function useDict(): Dictionary {
  const ctx = useContext(DictionaryContext)
  if (!ctx) throw new Error("useDict must be used inside DictionaryProvider")
  return ctx
}
