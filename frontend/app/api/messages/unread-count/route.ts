import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

export async function GET(_request: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ unread: 0 })

  try {
    const res = await fetch(`${API_URL}/v1/messages/unread-count`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json({ unread: 0 })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ unread: 0 })
  }
}
