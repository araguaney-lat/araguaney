import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

  const { searchParams } = request.nextUrl
  const params = new URLSearchParams()
  for (const key of ["status", "from_center_id", "to_center_id"]) {
    const v = searchParams.get(key)
    if (v) params.set(key, v)
  }
  const qs = params.toString() ? `?${params.toString()}` : ""
  const res = await fetch(`${API_URL}/v1/transfers${qs}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

  const res = await fetch(`${API_URL}/v1/transfers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: await request.text(),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
