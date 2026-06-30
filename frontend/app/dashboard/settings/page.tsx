import { auth } from "@/auth"
import Link from "next/link"

export default async function SettingsPage() {
  const session = await auth()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Mi perfil</h1>
        <p className="text-sm text-zinc-500 mt-1">Información de tu cuenta</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
        <div className="px-5 py-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-zinc-500">Correo electrónico</p>
            <p className="text-sm font-medium text-zinc-800 mt-0.5">{session?.user?.email ?? "—"}</p>
          </div>
        </div>
        <div className="px-5 py-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-zinc-500">Rol en el centro</p>
            <p className="text-sm font-medium text-zinc-800 mt-0.5 capitalize">
              {session?.centerRole?.replace("_", " ") ?? "—"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">Seguridad</h2>
        <Link
          href="/dashboard/settings/security"
          className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:bg-zinc-50 transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-zinc-800">Autenticación en dos pasos (2FA)</p>
            <p className="text-xs text-zinc-500 mt-0.5">Protege tu cuenta con una app autenticadora</p>
          </div>
          <span className="text-zinc-400 text-sm">›</span>
        </Link>
      </div>
    </div>
  )
}
