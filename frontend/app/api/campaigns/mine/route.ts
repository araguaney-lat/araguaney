import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  try {
    const data = await apiFetch("/v1/campaigns/mine", { token: session?.accessToken })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
