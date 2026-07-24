"use client"

import { useState, useRef, useCallback } from "react"

interface RxNormSuggestion {
  rxcui: string
  name: string
}

interface InnAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function InnAutocomplete({
  value,
  onChange,
  placeholder = "Ibuprofeno, Paracetamol…",
  className = "",
}: InnAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<RxNormSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback((q: string) => {
    if (debounce.current) clearTimeout(debounce.current)
    if (q.length < 2) { setSuggestions([]); setOffline(false); return }

    debounce.current = setTimeout(async () => {
      setLoading(true)
      setOffline(false)
      try {
        const res = await fetch(`/api/catalog/rxnorm?q=${encodeURIComponent(q)}`)
        if (res.status === 503) {
          setOffline(true)
          setSuggestions([])
        } else if (res.ok) {
          setSuggestions(await res.json())
        } else {
          setSuggestions([])
        }
      } catch {
        setOffline(true)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    onChange(v)
    fetchSuggestions(v)
    setShowDropdown(true)
  }

  const handleSelect = (name: string) => {
    onChange(name)
    setSuggestions([])
    setShowDropdown(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => value.length >= 2 && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-inpB px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)] ${className}`}
      />
      {loading && (
        <p className="mt-1 text-xs text-fnt">Buscando en RxNorm…</p>
      )}
      {offline && (
        <p className="mt-1 text-xs text-dDraftT">
          Sin conexión — sugerencias RxNorm no disponibles. Puedes escribir el INN manualmente.
        </p>
      )}
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-cardB bg-card shadow-md">
          {suggestions.map((s) => (
            <li key={s.rxcui}>
              <button
                type="button"
                onMouseDown={() => handleSelect(s.name)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-card2"
              >
                <span className="text-sm text-tx">{s.name}</span>
                <span className="ml-auto text-xs text-fnt">RxCUI {s.rxcui}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
