import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import type { Campaign } from "@/types"
import { NextResponse } from "next/server"

// GET /v1/campaigns exige coordinator: es la lista completa, la de gestionarlas.
// Un volunteer recibia 403 y la pagina lo pintaba como "no hay campañas". Para
// ese rol la lista correcta es /mine, las campañas a las que pertenece.
const CAN_LIST_ALL = ["coordinator", "national_admin"]

export async function GET(request: Request) {
  const session = await auth()
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get("active_only") === "true"

  try {
    if (CAN_LIST_ALL.includes(session?.centerRole ?? "")) {
      const data = await apiFetch<Campaign[]>(
        `/v1/campaigns${activeOnly ? "?active_only=true" : ""}`,
        { token: session?.accessToken }
      )
      return NextResponse.json(data)
    }

    // /mine no acepta active_only: se filtra aqui para que esta ruta devuelva
    // lo mismo con cualquier rol.
    const mine = await apiFetch<Campaign[]>("/v1/campaigns/mine", {
      token: session?.accessToken,
    })
    return NextResponse.json(activeOnly ? mine.filter((c) => c.is_active) : mine)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
