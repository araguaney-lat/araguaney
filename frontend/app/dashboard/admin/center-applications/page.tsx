import { auth } from "@/auth"
import { redirect } from "next/navigation"
import CenterApplicationsQueue from "@/components/CenterApplicationsQueue"
import { listCenterApplications } from "@/lib/center-application-actions"
import { getLocale, getDictionary } from "@/lib/i18n"

export default async function CenterApplicationsAdminPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isNationalAdmin = session.centerRole === "national_admin"
  const isSuperadmin = session.platformRole === "superadmin"
  if (!isNationalAdmin && !isSuperadmin) redirect("/dashboard")

  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.dashboard.center_applications

  const applications = await listCenterApplications()

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-tx">{t.title}</h1>
        <p className="mt-0.5 text-sm text-mut">{t.subtitle}</p>
      </div>

      <CenterApplicationsQueue
        initial={applications}
        locale={locale}
        labels={{
          count_one: t.count_one,
          count_other: t.count_other,
          empty: t.empty,
          contact: t.contact,
          backing: t.backing,
          social: t.social,
          message: t.message,
          created: t.created,
          approve: t.approve,
          approving: t.approving,
          reject: t.reject,
          rejecting: t.rejecting,
          reject_reason_label: t.reject_reason_label,
          reject_reason_placeholder: t.reject_reason_placeholder,
          reject_confirm: t.reject_confirm,
          cancel: t.cancel,
          error_unknown: dict.dashboard.common.error_unknown,
        }}
      />
    </div>
  )
}
