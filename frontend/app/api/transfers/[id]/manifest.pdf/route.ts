import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

  const { id } = await params
  const res = await fetch(`${API_URL}/v1/transfers/${id}/manifest.pdf`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  })

  if (!res.ok) {
    return NextResponse.json({ error: "Error al generar manifiesto" }, { status: res.status })
  }

  const buffer = await res.arrayBuffer()
  const disposition = res.headers.get("Content-Disposition") ?? `attachment; filename="transferencia-${id.slice(0, 8)}.pdf"`
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
    },
  })
}
