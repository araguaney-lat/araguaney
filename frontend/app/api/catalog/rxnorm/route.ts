import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json([], { status: 200 })

  const q = request.nextUrl.searchParams.get("q") ?? ""

  const res = await fetch(`${API_URL}/v1/catalog/rxnorm?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    next: { revalidate: 0 },
  })

  if (!res.ok) return NextResponse.json([], { status: res.status })
  return NextResponse.json(await res.json(), { status: res.status })
}
