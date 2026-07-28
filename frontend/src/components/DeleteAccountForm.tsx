"use client"

import { useActionState, useState } from "react"
import { deleteAccountAction } from "@/lib/actions"

interface Props {
  labels: {
    title: string
    body: string
    warning: string
    passwordLabel: string
    confirm: string
    pending: string
  }
}

/**
 * Danger zone: self-service ARCO cancellation.
 *
 * Two-stage on purpose. The button alone only reveals the form, so the
 * destructive action always requires a deliberate second step plus the
 * password. On success the server action signs the user out, so there is no
 * success state to render here.
 */
export function DeleteAccountForm({ labels }: Props) {
  const [state, formAction, isPending] = useActionState(deleteAccountAction, null)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="rounded-xl border border-dRejB bg-card px-5 py-4">
      <p className="text-sm font-medium text-dRejT">{labels.title}</p>
      <p className="text-xs text-mut mt-1 leading-relaxed">{labels.body}</p>
      <p className="text-xs font-medium text-dRejT mt-2">{labels.warning}</p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-lg border border-dRejB px-4 py-2 text-sm font-medium text-dRejT hover:bg-dRejB transition-colors"
        >
          {labels.title}
        </button>
      ) : (
        <form action={formAction} className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-mut mb-1">
              {labels.passwordLabel}
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-inpB bg-inp text-tx px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            />
          </div>
          {state?.error && <p className="text-xs text-dRejT">{state.error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-dRejT disabled:opacity-60"
          >
            {isPending ? labels.pending : labels.confirm}
          </button>
        </form>
      )}
    </div>
  )
}
