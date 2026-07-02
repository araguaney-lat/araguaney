"use client"

import { useActionState, useRef, useState } from "react"
import { uploadAvatarAction } from "@/lib/actions"

interface AvatarUploadProps {
  initialUrl: string | null
  initials: string
  labels: {
    avatar_change: string
    avatar_uploading: string
    avatar_hint: string
    avatar_uploaded: string
  }
}

export function AvatarUpload({ initialUrl, initials, labels }: AvatarUploadProps) {
  const [state, formAction, isPending] = useActionState(uploadAvatarAction, null)
  const [preview, setPreview] = useState<string | null>(initialUrl)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const avatarUrl = (state && "avatar_url" in state ? state.avatar_url : null) ?? preview

  return (
    <form
      action={async (formData) => {
        const file = inputRef.current?.files?.[0]
        if (file) setPreview(URL.createObjectURL(file))
        setSuccess(false)
        await formAction(formData)
        setSuccess(true)
      }}
      className="flex flex-wrap items-center gap-4"
    >
      <div className="flex-shrink-0 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-amber-300 text-lg font-bold text-amber-900">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="min-w-0 flex-1">
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          required
          onChange={() => inputRef.current?.form?.requestSubmit()}
          className="hidden"
          id="avatar-file-input"
        />
        <label
          htmlFor="avatar-file-input"
          className="inline-block cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          {isPending ? labels.avatar_uploading : labels.avatar_change}
        </label>
        <p className="text-xs text-zinc-500 mt-1">{labels.avatar_hint}</p>
        {state && "error" in state && state.error && (
          <p className="text-sm text-red-600 mt-1">{state.error as string}</p>
        )}
        {success && !(state && "error" in state && state.error) && (
          <p className="text-sm text-green-600 mt-1">{labels.avatar_uploaded}</p>
        )}
      </div>
    </form>
  )
}
