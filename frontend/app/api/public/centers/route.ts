import { NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? "http://localhost:8000"

/** Centros activos para el formulario de donación. Sin datos de contacto. */
export async function GET() {
  const res = await fetch(`${API_URL}/v1/public/centers`, { next: { revalidate: 300 } })
  if (!res.ok) return NextResponse.json([], { status: 200 })
  return NextResponse.json(await res.json(), {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
  })
}
