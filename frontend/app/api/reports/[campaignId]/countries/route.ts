import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { campaignId } = await params
  const search = request.nextUrl.searchParams.toString()
  const url = `${API_URL}/v1/reports/campaign/${campaignId}/countries${search ? `?${search}` : ""}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${session.accessToken}` }, cache: "no-store" })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
