"use client"

import { useActionState, useState } from "react"
import { updateProfileAction } from "@/lib/actions"

interface ProfileNameFormProps {
  initialName: string
  labels: {
    field_name: string
    save: string
    saving: string
    name_updated: string
  }
}

export function ProfileNameForm({ initialName, labels }: ProfileNameFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, null)
  const [success, setSuccess] = useState(false)

  return (
    <form
      action={async (formData) => {
        setSuccess(false)
        await formAction(formData)
        setSuccess(true)
      }}
      className="space-y-3"
    >
      <div>
        <label className="block text-xs font-medium text-mut mb-1">{labels.field_name}</label>
        <input
          name="full_name"
          type="text"
          required
          defaultValue={initialName}
          className="w-full rounded-lg border border-inpB bg-inp text-tx px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
        />
      </div>

      {state && "error" in state && state.error && (
        <p className="text-sm text-dRejT rounded-lg bg-dRejB px-3 py-2">{state.error as string}</p>
      )}
      {success && !(state && "error" in state && state.error) && (
        <p className="text-sm text-dSealT rounded-lg bg-dSealB px-3 py-2">{labels.name_updated}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#3B2A00] hover:opacity-90 disabled:opacity-60 transition-colors"
      >
        {isPending ? labels.saving : labels.save}
      </button>
    </form>
  )
}
