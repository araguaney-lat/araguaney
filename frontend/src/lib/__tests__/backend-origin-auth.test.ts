import { describe, expect, it, vi } from "vitest"
import { makeOriginAuthFetch } from "../backend-origin-auth"

/* El interceptor añade X-Origin-Auth solo a las peticiones al origen del backend.
 * Es lo que deja pasar las llamadas server-to-server de Vercel cuando el backend
 * activa CLOUDFLARE_ONLY, sin exponer el secreto a nadie más ni tocar otros
 * destinos (Cloudinary, Open Food Facts, etc.). */

const BASE = "https://api.internal.railway"
const SECRET = "s3cr3t-de-prueba"

function spyFetch() {
  return vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 200 }),
  )
}

describe("makeOriginAuthFetch", () => {
  it("adds the secret header on requests to the backend origin", async () => {
    const original = spyFetch()
    const wrapped = makeOriginAuthFetch(original, BASE, SECRET)

    await wrapped(`${BASE}/v1/boxes`, { headers: { Authorization: "Bearer x" } })

    const init = original.mock.calls[0][1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get("X-Origin-Auth")).toBe(SECRET)
    // No pisa lo que ya venía.
    expect(headers.get("Authorization")).toBe("Bearer x")
  })

  it("leaves requests to other hosts untouched", async () => {
    const original = spyFetch()
    const wrapped = makeOriginAuthFetch(original, BASE, SECRET)

    await wrapped("https://world.openfoodfacts.org/api/x")

    const init = (original.mock.calls[0][1] ?? {}) as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get("X-Origin-Auth")).toBeNull()
  })

  it("works when no init is passed", async () => {
    const original = spyFetch()
    const wrapped = makeOriginAuthFetch(original, BASE, SECRET)

    await wrapped(`${BASE}/v1/health`)

    const init = original.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get("X-Origin-Auth")).toBe(SECRET)
  })
})
