"use client"

import { useActionState } from "react"
import Link from "next/link"
import { acceptTermsAction } from "@/lib/actions"
import { useDict } from "@/context/DictionaryContext"
import { useLocale } from "@/context/LocaleContext"

export default function AcceptTermsPage() {
  const dict = useDict()
  const t = dict.auth.accept_terms
  const locale = useLocale()
  const termsHref = locale === "en" ? "/terms" : "/terminos"
  const privacyHref = locale === "en" ? "/privacy" : "/aviso-de-privacidad"
  const [state, formAction, isPending] = useActionState(acceptTermsAction, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-zinc-900">{t.title}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {t.subtitle}
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 text-sm text-zinc-700">
              <input
                name="accepted_terms"
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-amber-500 focus:ring-amber-400"
              />
              <span>
                {t.checkbox_prefix}{" "}
                <Link href={termsHref} target="_blank" className="font-semibold text-amber-700 underline">
                  {t.checkbox_terms}
                </Link>{" "}
                {t.checkbox_and}{" "}
                <Link href={privacyHref} target="_blank" className="font-semibold text-amber-700 underline">
                  {t.checkbox_privacy}
                </Link>
                .
              </span>
            </label>

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
              {isPending ? t.saving : t.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
