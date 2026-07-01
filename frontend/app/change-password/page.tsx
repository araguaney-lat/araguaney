"use client"

import { useActionState } from "react"
import { changePasswordAction } from "@/lib/actions"

export default function ChangePasswordPage() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-zinc-900">Cambiar contraseña</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Debes establecer una nueva contraseña antes de continuar.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Contraseña actual
              </label>
              <input
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Nueva contraseña
              </label>
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
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Confirmar nueva contraseña
              </label>
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
              <p className="text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2">
                {state.error as string}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60 transition-colors"
            >
              {isPending ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
