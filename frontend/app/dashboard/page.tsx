import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { WeightCards } from "@/components/WeightCards"

export default async function DashboardPage() {
  const session = await auth()
  const centerRole = session?.centerRole

  if (centerRole === "national_admin") {
    redirect("/dashboard/national")
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Panel de control</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {centerRole === "coordinator"
          ? "Vista de coordinador — tu centro."
          : "Vista de voluntario — tu centro."}
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {centerRole && ["coordinator", "volunteer"].includes(centerRole) && (
          <>
            <Link href="/dashboard/intake" className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all">
              <p className="text-xs text-zinc-500 mb-1">Recepción</p>
              <p className="font-semibold text-zinc-900">Nuevo intake</p>
            </Link>
            <Link href="/dashboard/boxes" className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all">
              <p className="text-xs text-zinc-500 mb-1">Cajas</p>
              <p className="font-semibold text-zinc-900">Ver cajas</p>
            </Link>
          </>
        )}
        {centerRole === "coordinator" && (
          <>
            <Link href="/dashboard/pallets" className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all">
              <p className="text-xs text-zinc-500 mb-1">Tarimas</p>
              <p className="font-semibold text-zinc-900">Gestionar tarimas</p>
            </Link>
            <Link href="/dashboard/shipments" className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all">
              <p className="text-xs text-zinc-500 mb-1">Envíos</p>
              <p className="font-semibold text-zinc-900">Gestionar envíos</p>
            </Link>
          </>
        )}
      </div>
      <WeightCards />
    </div>
  )
}
