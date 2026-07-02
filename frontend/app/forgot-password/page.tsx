"use client"

import { useActionState } from "react"
import Link from "next/link"
import { forgotPasswordAction } from "@/lib/actions"

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, null)
  const success = state && "success" in state && state.success

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          {success ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold text-zinc-900">Revisa tu correo</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Si ese correo está registrado, te enviamos un enlace para restablecer tu contraseña. Es válido por 1 hora.
              </p>
              <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-amber-700 hover:text-amber-800">
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-xl font-semibold text-zinc-900">¿Olvidaste tu contraseña?</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Ingresa tu correo y te enviaremos un enlace para restablecerla.
                </p>
              </div>

              <form action={formAction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Correo electrónico</label>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="coordinador@centro.org"
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
                  {isPending ? "Enviando…" : "Enviar enlace"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-500">
                <Link href="/login" className="font-semibold text-amber-700 hover:text-amber-800">
                  Volver a iniciar sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
