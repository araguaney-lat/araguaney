import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json([], { status: 200 })

  const category = request.nextUrl.searchParams.get("category") ?? ""
  const params = new URLSearchParams()
  if (category) params.set("category", category)

  const res = await fetch(`${API_URL}/v1/product-types${params.size ? `?${params}` : ""}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    next: { revalidate: 0 },
  })

  if (!res.ok) return NextResponse.json([], { status: 200 })
  return NextResponse.json(await res.json())
}
