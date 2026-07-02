import { auth } from "@/auth"
import Link from "next/link"
import { ChangePasswordForm } from "@/components/ChangePasswordForm"
import { ProfileNameForm } from "@/components/ProfileNameForm"
import { AvatarUpload } from "@/components/AvatarUpload"
import { apiFetch } from "@/lib/api"
import { getLocale, getDictionary } from "@/lib/i18n"
import type { UserProfileOut } from "@/types"

export default async function SettingsPage() {
  const session = await auth()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.dashboard.settings
  const roleLabels = dict.dashboard.role

  const profile = session?.accessToken
    ? await apiFetch<UserProfileOut>("/v1/auth/me/profile", { token: session.accessToken })
    : null

  const displayName = profile?.full_name ?? profile?.username ?? ""
  const initials = (displayName || profile?.email || "?")[0].toUpperCase()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{t.my_profile}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t.profile_subtitle}</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-5">
        <AvatarUpload
          initialUrl={profile?.avatar_url ?? null}
          initials={initials}
          labels={{
            avatar_change: t.avatar_change,
            avatar_uploading: t.avatar_uploading,
            avatar_hint: t.avatar_hint,
          }}
        />

        <ProfileNameForm
          initialName={displayName}
          labels={{
            field_name: t.field_name,
            save: t.save,
            saving: t.saving,
            name_updated: t.name_updated,
          }}
        />

        <div>
          <p className="text-xs text-zinc-500">{t.field_email}</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">{profile?.email ?? "—"}</p>
        </div>

        <div>
          <p className="text-xs text-zinc-500">{t.role_label}</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">
            {profile?.center_role ? roleLabels[profile.center_role] ?? profile.center_role : "—"}
          </p>
        </div>

        <div>
          <p className="text-xs text-zinc-500">{t.center_label}</p>
          <p className="text-sm font-medium text-zinc-800 mt-0.5">
            {profile?.center_name ?? (profile?.center_id === null ? t.center_national : "—")}
          </p>
        </div>

        <div>
          <p className="text-xs text-zinc-500 mb-1.5">{t.campaigns_label}</p>
          {profile?.campaigns.length ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.campaigns.map((c) => (
                <span
                  key={c.id}
                  className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
                >
                  {c.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">{t.no_campaigns}</p>
          )}
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
