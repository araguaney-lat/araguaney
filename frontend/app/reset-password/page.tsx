"use client"

import { Suspense, useActionState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { resetPasswordAction } from "@/lib/actions"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [state, formAction, isPending] = useActionState(resetPasswordAction, null)
  const success = state && "success" in state && state.success

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Enlace inválido</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Este enlace no incluye un token de restablecimiento. Solicita uno nuevo.
        </p>
        <Link href="/forgot-password" className="mt-6 inline-block text-sm font-semibold text-amber-700 hover:text-amber-800">
          Solicitar enlace
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Contraseña actualizada</h1>
        <p className="mt-2 text-sm text-zinc-500">Ya puedes iniciar sesión con tu nueva contraseña.</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-amber-700 hover:text-amber-800">
          Iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Restablecer contraseña</h1>
        <p className="mt-1 text-sm text-zinc-500">Elige una nueva contraseña para tu cuenta.</p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Nueva contraseña</label>
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
          <label className="block text-sm font-medium text-zinc-700 mb-1">Confirmar nueva contraseña</label>
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

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60 transition-colors"
        >
          {isPending ? "Guardando…" : "Restablecer contraseña"}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          <Suspense fallback={<p className="text-center text-sm text-zinc-500">Cargando…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
