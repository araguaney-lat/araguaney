"use client"

import { useActionState, useState } from "react"
import { changePasswordAction } from "@/lib/actions"

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, null)
  const [success, setSuccess] = useState(false)

  return (
    <form
      action={async (formData) => {
        setSuccess(false)
        await formAction(formData)
      }}
      className="space-y-3"
    >
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Contraseña actual</label>
        <input
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Nueva contraseña</label>
        <input
          name="new_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Confirmar nueva contraseña</label>
        <input
          name="confirm_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {state && "error" in state && state.error && (
        <p className="text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2">{state.error as string}</p>
      )}
      {success && (
        <p className="text-sm text-green-600 rounded-lg bg-green-50 px-3 py-2">Contraseña actualizada.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-500 disabled:opacity-60 transition-colors"
      >
        {isPending ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  )
}
