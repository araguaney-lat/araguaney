import { auth } from "@/auth"
import Link from "next/link"
import { ChangePasswordForm } from "@/components/ChangePasswordForm"
import { DeleteAccountForm } from "@/components/DeleteAccountForm"
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
        <h1 className="text-xl font-semibold text-tx">{t.my_profile}</h1>
        <p className="text-sm text-mut mt-1">{t.profile_subtitle}</p>
      </div>

      <div className="rounded-xl border border-cardB bg-card p-5 space-y-5">
        <AvatarUpload
          initialUrl={profile?.avatar_url ?? null}
          initials={initials}
          labels={{
            avatar_change: t.avatar_change,
            avatar_uploading: t.avatar_uploading,
            avatar_hint: t.avatar_hint,
            avatar_uploaded: t.avatar_uploaded,
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
          <p className="text-xs text-mut">{t.field_email}</p>
          <p className="text-sm font-medium text-tx mt-0.5">{profile?.email ?? "—"}</p>
        </div>

        <div>
          <p className="text-xs text-mut">{t.role_label}</p>
          <p className="text-sm font-medium text-tx mt-0.5">
            {profile?.center_role ? roleLabels[profile.center_role] ?? profile.center_role : "—"}
          </p>
        </div>

        <div>
          <p className="text-xs text-mut">{t.center_label}</p>
          <p className="text-sm font-medium text-tx mt-0.5">
            {profile?.center_name ?? (profile?.center_id === null ? t.center_national : "—")}
          </p>
        </div>

        <div>
          <p className="text-xs text-mut mb-1.5">{t.campaigns_label}</p>
          {profile?.campaigns.length ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.campaigns.map((c) => (
                <span
                  key={c.id}
                  className="rounded-full bg-goldSoft border border-goldB px-2.5 py-1 text-xs font-medium text-tx"
                >
                  {c.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-fnt">{t.no_campaigns}</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-tx mb-3">{t.password_section}</h2>
        <div className="rounded-xl border border-cardB bg-card px-5 py-5">
          <ChangePasswordForm />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-tx mb-3">{t.security_section}</h2>
        <Link
          href="/dashboard/settings/security"
          className="flex items-center justify-between rounded-xl border border-cardB bg-card px-5 py-4 hover:bg-card2 transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-tx">{t.totp_link_title}</p>
            <p className="text-xs text-mut mt-0.5">{t.totp_link_subtitle}</p>
          </div>
          <span className="text-fnt text-sm">›</span>
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-dRejT mb-3">{t.danger_section}</h2>
        <DeleteAccountForm
          labels={{
            title: t.delete_title,
            body: t.delete_body,
            warning: t.delete_warning,
            passwordLabel: t.delete_password_label,
            confirm: t.delete_confirm,
            pending: t.delete_pending,
          }}
        />
      </div>
    </div>
  )
}
