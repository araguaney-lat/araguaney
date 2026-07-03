"use client"

import { Suspense, useActionState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { resetPasswordAction } from "@/lib/actions"
import { useDict } from "@/context/DictionaryContext"
import type { Dictionary } from "@/lib/i18n"

function ResetPasswordForm({ t }: { t: Dictionary["auth"]["reset_password"] }) {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [state, formAction, isPending] = useActionState(resetPasswordAction, null)
  const success = state && "success" in state && state.success

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-semibold text-zinc-900">{t.invalid_title}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {t.invalid_message}
        </p>
        <Link href="/forgot-password" className="mt-6 inline-block text-sm font-semibold text-amber-700 hover:text-amber-800">
          {t.request_link}
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-semibold text-zinc-900">{t.success_title}</h1>
        <p className="mt-2 text-sm text-zinc-500">{t.success_message}</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-amber-700 hover:text-amber-800">
          {t.go_to_login}
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">{t.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t.subtitle}</p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{t.new_password}</label>
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
          <label className="block text-sm font-medium text-zinc-700 mb-1">{t.confirm_password}</label>
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
          {isPending ? t.saving : t.submit}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  const dict = useDict()
  const t = dict.auth.reset_password

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          <Suspense fallback={<p className="text-center text-sm text-zinc-500">{t.loading}</p>}>
            <ResetPasswordForm t={t} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
