import { getLocale, getDictionary } from "@/lib/i18n"
import { listEmailFailures } from "@/lib/email-failure-actions"
import { EmailFailuresTable } from "@/components/EmailFailuresTable"

// The studio layout already gates superadmin-only access.
export default async function StudioEmailsPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.studio.emails
  const failures = await listEmailFailures()

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">{t.title}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t.subtitle}</p>
      </div>
      <EmailFailuresTable initial={failures} labels={t} />
    </div>
  )
}
