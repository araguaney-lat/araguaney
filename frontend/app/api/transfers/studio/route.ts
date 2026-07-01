import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const params = new URLSearchParams()
  const status = searchParams.get("status")
  if (status) params.set("status", status)

  const res = await fetch(`${API_URL}/v1/transfers/studio?${params}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
