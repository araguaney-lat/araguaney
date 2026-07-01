import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function CatalogPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const isAdmin = session.centerRole === "national_admin"

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Catálogo de productos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Tipos de producto disponibles para tu campaña y el catálogo global.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/catalog/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + Nuevo tipo
          </Link>
        )}
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-sm text-zinc-500">Vista de catálogo — Fase 6 tarea 19</p>
      </div>
    </div>
  )
}
