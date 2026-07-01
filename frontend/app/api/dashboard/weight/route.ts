import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ campaigns: [], center_kg: null })

  const { searchParams } = request.nextUrl
  const params = new URLSearchParams()
  if (searchParams.get("campaign_id")) params.set("campaign_id", searchParams.get("campaign_id")!)
  if (searchParams.get("center_id")) params.set("center_id", searchParams.get("center_id")!)

  const qs = params.size ? `?${params}` : ""
  const res = await fetch(`${API_URL}/v1/dashboard/weight${qs}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    next: { revalidate: 0 },
  })

  if (!res.ok) return NextResponse.json({ campaigns: [], center_kg: null })
  return NextResponse.json(await res.json())
}
