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
        <label className="block text-xs font-medium text-zinc-600 mb-1">{labels.field_name}</label>
        <input
          name="full_name"
          type="text"
          required
          defaultValue={initialName}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {state && "error" in state && state.error && (
        <p className="text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2">{state.error as string}</p>
      )}
      {success && !(state && "error" in state && state.error) && (
        <p className="text-sm text-green-600 rounded-lg bg-green-50 px-3 py-2">{labels.name_updated}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-500 disabled:opacity-60 transition-colors"
      >
        {isPending ? labels.saving : labels.save}
      </button>
    </form>
  )
}
