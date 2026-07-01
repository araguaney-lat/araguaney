import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

  const { id } = await params
  const res = await fetch(`${API_URL}/v1/messages/${id}/read`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  return NextResponse.json(await res.json(), { status: res.status })
}
