import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import TOTPSettings from "./TOTPSettings"

async function getTotpStatus(token: string): Promise<boolean> {
  try {
    const me = await apiFetch<{ totp_enabled: boolean }>("/v1/auth/me", { token })
    return me.totp_enabled ?? false
  } catch {
    return false
  }
}

export default async function SecurityPage() {
  const session = await auth()
  const totpEnabled = session?.accessToken
    ? await getTotpStatus(session.accessToken)
    : false

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Seguridad</h1>
        <p className="text-sm text-zinc-500 mt-1">Autenticación en dos pasos</p>
      </div>
      <TOTPSettings initialEnabled={totpEnabled} />
    </div>
  )
}
