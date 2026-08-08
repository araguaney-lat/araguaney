/* Cliente HTTP para React Query, del lado del navegador.
 *
 * Las pantallas del panel llaman a los route handlers de Next (`/api/...`), que
 * reenvían al backend con la sesión. Este helper centraliza ese fetch: una sola
 * forma de leer el estado, parsear el envelope de error y lanzar, en vez de que
 * cada `queryFn` reimplemente el manejo de `!res.ok`.
 *
 * `apiGet` es para lecturas (queries). Las mutaciones siguen yendo por las server
 * actions ya existentes; React Query solo orquesta la invalidación tras ellas.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" })
  if (!res.ok) {
    // El backend responde con envelope {error:{code,message}}; si el cuerpo no
    // es JSON (backend caído, HTML de error), se cae a un mensaje genérico.
    const body = await res.json().catch(() => null)
    const code = body?.error?.code as string | undefined
    const message = (body?.error?.message as string | undefined) ?? `Error ${res.status}`
    throw new ApiError(message, res.status, code)
  }
  return res.json() as Promise<T>
}
