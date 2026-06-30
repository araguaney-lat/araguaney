import { NextRequest, NextResponse } from "next/server"
import { verifyTurnstile } from "@/lib/turnstile"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const token = request.headers.get("x-turnstile-token")
  if (!token) {
    return NextResponse.json({ error: "Missing turnstile token" }, { status: 400 })
  }

  const valid = await verifyTurnstile(token)
  if (!valid) {
    return NextResponse.json({ error: "Turnstile verification failed" }, { status: 403 })
  }

  const { code } = await params
  const res = await fetch(`${API_URL}/b/${encodeURIComponent(code)}`, {
    headers: { "Cache-Control": "no-store" },
  })

  if (res.status === 404) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Error fetching box data" }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
