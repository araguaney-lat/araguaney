import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import Link from "next/link"

interface NationalStats {
  total_centers: number
  active_centers: number
  total_boxes: number
  boxes_by_category: Record<string, number>
}

async function getStats(token: string): Promise<NationalStats | null> {
  try {
    return await apiFetch<NationalStats>("/v1/dashboard/national", { token })
  } catch {
    return null
  }
}

const QUICK_LINKS = [
  { href: "/studio/users", label: "Usuarios", desc: "Gestionar cuentas, bloquear usuarios, crear national admins" },
  { href: "/studio/transfers", label: "Transferencias", desc: "Vista global de todas las transferencias entre centros" },
  { href: "/studio/audit", label: "Auditoría", desc: "Registro completo de todas las acciones del sistema" },
  { href: "/studio/settings", label: "Configuración", desc: "Variables operativas del sistema" },
]

export default async function StudioHubPage() {
  const session = await auth()
  const stats = session?.accessToken ? await getStats(session.accessToken) : null

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Studio</h1>
        <p className="text-sm text-zinc-500 mt-1">Administración de plataforma — Araguaney</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Centros activos", value: stats.active_centers },
            { label: "Centros totales", value: stats.total_centers },
            { label: "Cajas registradas", value: stats.total_boxes },
            { label: "Categorías activas", value: Object.keys(stats.boxes_by_category ?? {}).length },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-2xl font-bold text-blue-900">{s.value}</p>
              <p className="text-xs text-blue-600/80 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all group"
          >
            <p className="font-semibold text-zinc-900 group-hover:text-zinc-700">{link.label}</p>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
