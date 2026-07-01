import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json([], { status: 200 })

  const { id } = await params
  const res = await fetch(`${API_URL}/v1/campaigns/${id}/members`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    next: { revalidate: 0 },
  })

  if (!res.ok) return NextResponse.json([], { status: 200 })
  return NextResponse.json(await res.json())
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const res = await fetch(`${API_URL}/v1/campaigns/${id}/members`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  return NextResponse.json(await res.json(), { status: res.status })
}
