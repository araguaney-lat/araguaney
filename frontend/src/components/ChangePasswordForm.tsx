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
        <label className="block text-xs font-medium text-mut mb-1">Contraseña actual</label>
        <input
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-inpB bg-inp text-tx px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-mut mb-1">Nueva contraseña</label>
        <input
          name="new_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-inpB bg-inp text-tx px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-mut mb-1">Confirmar nueva contraseña</label>
        <input
          name="confirm_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-inpB bg-inp text-tx px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
        />
      </div>

      {state && "error" in state && state.error && (
        <p className="text-sm text-dRejT rounded-lg bg-dRejB px-3 py-2">{state.error as string}</p>
      )}
      {success && (
        <p className="text-sm text-dSealT rounded-lg bg-dSealB px-3 py-2">Contraseña actualizada.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#3B2A00] hover:opacity-90 disabled:opacity-60 transition-colors"
      >
        {isPending ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  )
}
