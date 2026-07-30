"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { apiFetch } from "@/lib/api"
import type { Donor, DonorDraft } from "@/types"
import { useDict } from "@/context/DictionaryContext"

interface Props {
  value: DonorDraft
  onChange: (draft: DonorDraft) => void
}

/** Formulario de donante identificado. Se despliega solo con el check activo:
 *  la donación anónima sigue siendo el default del sistema. */
export function DonorForm({ value, onChange }: Props) {
  const dict = useDict()
  const t = dict.dashboard.intake_new.donor

  const { data: session } = useSession()
  const token = session?.accessToken ?? ""

  const [matches, setMatches] = useState<Donor[]>([])
  const [searching, setSearching] = useState(false)

  const isMoral = value.donor_type === "moral"
  const set = (field: keyof DonorDraft) => (v: string) => onChange({ ...value, [field]: v })

  // Autocompletado por lo que ya capturó este centro. Se dispara con el email
  // porque es la llave de reuso; si el donante ya existe, se reutiliza su
  // registro en vez de crear un duplicado.
  useEffect(() => {
    const q = value.email.trim()
    if (q.length < 2 || !token) {
      setMatches([])
      return
    }
    const timer = setTimeout(() => {
      setSearching(true)
      apiFetch<Donor[]>(`/v1/intakes/donors/search?q=${encodeURIComponent(q)}`, { token })
        .then(setMatches)
        .catch(() => setMatches([]))
        .finally(() => setSearching(false))
    }, 350)
    return () => clearTimeout(timer)
  }, [value.email, token])

  const useMatch = (d: Donor) => {
    onChange({
      donor_type: d.donor_type,
      first_name: d.first_name,
      last_name: d.last_name,
      legal_name: d.legal_name ?? "",
      email: d.email ?? "",
      phone: d.phone ?? "",
    })
    setMatches([])
  }

  const field = (label: string, key: keyof DonorDraft, required: boolean, type = "text") => (
    <div>
      <label className="block text-xs font-medium text-mut mb-1">
        {label}
        {required && <span className="text-[var(--dRejT)]"> *</span>}
      </label>
      <input
        type={type}
        value={value[key] as string}
        onChange={(e) => set(key)(e.target.value)}
        className="w-full rounded-lg border border-inpB bg-inp px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
      />
    </div>
  )

  return (
    <div className="rounded-xl border border-cardB bg-card2 p-4 space-y-4">
      <div className="flex gap-2">
        {(["fisica", "moral"] as const).map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => onChange({ ...value, donor_type: tipo, legal_name: "" })}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              value.donor_type === tipo
                ? "bg-[var(--blue)] text-white"
                : "bg-card text-mut hover:bg-card2 border border-cardB"
            }`}
          >
            {tipo === "fisica" ? t.type_fisica : t.type_moral}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isMoral && (
          <div className="sm:col-span-2">{field(t.legal_name, "legal_name", true)}</div>
        )}
        {field(isMoral ? t.rep_first_name : t.first_name, "first_name", true)}
        {field(isMoral ? t.rep_last_name : t.last_name, "last_name", true)}
        {field(t.email, "email", isMoral, "email")}
        {field(t.phone, "phone", isMoral, "tel")}
      </div>

      {isMoral ? (
        <p className="text-xs text-fnt">{t.hint_moral}</p>
      ) : (
        <p className="text-xs text-fnt">{t.hint_fisica}</p>
      )}

      {searching && <p className="text-xs text-fnt">{dict.dashboard.common.loading}</p>}

      {matches.length > 0 && (
        <div className="rounded-lg border border-cardB bg-card p-3">
          <p className="mb-2 text-xs font-semibold text-mut">{t.matches_title}</p>
          <ul className="space-y-1">
            {matches.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => useMatch(d)}
                  className="w-full rounded px-2 py-1 text-left text-xs text-tx hover:bg-card2"
                >
                  <span className="font-medium">
                    {d.legal_name ?? `${d.first_name} ${d.last_name}`}
                  </span>
                  {d.email && <span className="text-fnt"> · {d.email}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
