import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { getLocale, getDictionary } from "@/lib/i18n"
import type { IntakeOut } from "@/types"

export const revalidate = 30

export default async function IntakePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.dashboard.intake
  const dateFmt = locale === "en" ? "en-US" : "es-MX"

  let intakes: IntakeOut[] = []
  try {
    intakes = await apiFetch<IntakeOut[]>("/v1/intakes", {
      token: session.accessToken,
      next: { revalidate: 30 },
    })
  } catch {
    // Error handled below — empty array renders gracefully
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">{t.title}</h1>
        <Link
          href="/dashboard/intake/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          {t.new}
        </Link>
      </div>

      {intakes.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          {t.empty}
        </div>
      ) : (
        <ul className="space-y-3">
          {intakes.map((intake) => (
            <li key={intake.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {intake.donante_libre || t.anonymous}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {new Date(intake.created_at).toLocaleString(dateFmt, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                {intake.notes && (
                  <p className="text-xs text-zinc-400 max-w-xs truncate">{intake.notes}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
