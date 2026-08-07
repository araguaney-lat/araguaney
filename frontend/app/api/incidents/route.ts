import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

  const status = request.nextUrl.searchParams.get("status")
  const query = status ? `?status=${encodeURIComponent(status)}` : ""
  const res = await fetch(`${API_URL}/v1/incidents${query}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
