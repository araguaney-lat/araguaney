import type { Metadata } from "next"

import ManageDonation from "@/components/ManageDonation"
import { getManagedDonation } from "@/lib/donation-actions"

// Es un enlace privado que llega por correo: no se indexa ni se comparte.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function ManageDonationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const donation = await getManagedDonation(token)

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      {donation === null ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-zinc-900">Este enlace ya no sirve</h1>
          <p className="mt-3 text-sm text-zinc-600">
            Los enlaces de gestión vencen a los 30 días, y dejan de funcionar en cuanto entregas
            la donación. Si necesitas algo, escríbenos a{" "}
            <a className="text-amber-700 underline" href="mailto:hola@araguaney.lat">hola@araguaney.lat</a>.
          </p>
        </div>
      ) : (
        <ManageDonation token={token} donation={donation} />
      )}
    </main>
  )
}
