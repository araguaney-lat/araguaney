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
      className="space-y-2"
    >
      <label className="block text-xs text-zinc-500">{labels.field_name}</label>
      <div className="flex items-center gap-2">
        <input
          name="full_name"
          type="text"
          required
          defaultValue={initialName}
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-500 disabled:opacity-60 transition-colors"
        >
          {isPending ? labels.saving : labels.save}
        </button>
      </div>
      {state && "error" in state && state.error && (
        <p className="text-sm text-red-600">{state.error as string}</p>
      )}
      {success && !state?.error && (
        <p className="text-sm text-green-600">{labels.name_updated}</p>
      )}
    </form>
  )
}
