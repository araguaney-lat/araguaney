import { auth } from "@/auth"
import Link from "next/link"
import { ChangePasswordForm } from "@/components/ChangePasswordForm"
import { getLocale, getDictionary } from "@/lib/i18n"

export default async function SettingsPage() {
  const session = await auth()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.dashboard.settings

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{t.my_profile}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t.profile_subtitle}</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
        <div className="px-5 py-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-zinc-500">{t.field_email}</p>
            <p className="text-sm font-medium text-zinc-800 mt-0.5">{session?.user?.email ?? "—"}</p>
          </div>
        </div>
        <div className="px-5 py-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-zinc-500">{t.role_label}</p>
            <p className="text-sm font-medium text-zinc-800 mt-0.5 capitalize">
              {session?.centerRole?.replace("_", " ") ?? "—"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">{t.password_section}</h2>
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-5">
          <ChangePasswordForm />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">{t.security_section}</h2>
        <Link
          href="/dashboard/settings/security"
          className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:bg-zinc-50 transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-zinc-800">{t.totp_link_title}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{t.totp_link_subtitle}</p>
          </div>
          <span className="text-zinc-400 text-sm">›</span>
        </Link>
      </div>
    </div>
  )
}
