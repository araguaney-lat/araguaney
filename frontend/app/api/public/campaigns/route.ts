import { NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

/** Campañas activas y públicas. Las internas no se listan. */
export async function GET() {
  const res = await fetch(`${API_URL}/v1/public/campaigns`, { next: { revalidate: 300 } })
  if (!res.ok) return NextResponse.json([], { status: 200 })
  return NextResponse.json(await res.json(), {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
  })
}
