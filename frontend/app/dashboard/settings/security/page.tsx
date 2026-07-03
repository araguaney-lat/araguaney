import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { getLocale, getDictionary } from "@/lib/i18n"
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
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.dashboard.settings

  const totpEnabled = session?.accessToken
    ? await getTotpStatus(session.accessToken)
    : false

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-tx">{t.security_title}</h1>
        <p className="text-sm text-mut mt-1">{t.security_subtitle}</p>
      </div>
      <TOTPSettings initialEnabled={totpEnabled} />
    </div>
  )
}
