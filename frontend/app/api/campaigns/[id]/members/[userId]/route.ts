import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

type Params = { params: Promise<{ id: string; userId: string }> }

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

  const { id, userId } = await params
  const res = await fetch(`${API_URL}/v1/campaigns/${id}/members/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  if (res.status === 204) return new NextResponse(null, { status: 204 })
  return NextResponse.json(await res.json(), { status: res.status })
}
