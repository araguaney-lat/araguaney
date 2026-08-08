/* Añade el header `X-Origin-Auth` a toda petición del servidor de Next hacia el
 * backend (Railway), en un solo punto.
 *
 * Cuando el backend activa `CLOUDFLARE_ONLY`, rechaza cualquier petición que no
 * traiga ese secreto. El tráfico del navegador pasa por Cloudflare, que inyecta
 * el header con una Transform Rule; pero las llamadas server-to-server de Vercel
 * (los ~54 route handlers y `apiFetch` en el servidor) van **directas** a
 * Railway, sin pasar por Cloudflare, así que tienen que añadir el secreto ellas
 * mismas. Sin esto, activar `CLOUDFLARE_ONLY` tumbaría todo el panel.
 *
 * Se hace en un interceptor único del `fetch` global, no editando cada handler,
 * a propósito: un control de seguridad que hay que recordar poner en cada sitio
 * se olvida en el handler número 55. El interceptor solo toca las peticiones cuyo
 * URL apunta al origen del backend (`API_URL`); cualquier otro fetch (Cloudinary,
 * Open Food Facts, RxNorm) queda intacto. Sin `CLOUDFLARE_SHARED_SECRET`
 * configurado, es un no-op: desplegarlo antes de tener el secreto no cambia nada.
 */

type FetchFn = typeof fetch

/** Envuelve un `fetch` para inyectar `X-Origin-Auth` en las peticiones al
 * origen `base`. Exportado aparte del install para poder probarlo sin tocar el
 * `fetch` global. */
export function makeOriginAuthFetch(original: FetchFn, base: string, secret: string): FetchFn {
  return (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    if (!url.startsWith(base)) {
      return original(input, init)
    }
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    )
    headers.set("X-Origin-Auth", secret)
    return original(input, { ...init, headers })
  }
}

let installed = false

/** Instala el interceptor sobre `globalThis.fetch`. Idempotente. No-op si falta
 * el secreto o la URL base del backend. */
export function installBackendOriginAuth(): void {
  if (installed) return
  const secret = process.env.CLOUDFLARE_SHARED_SECRET
  const base = process.env.API_URL
  if (!secret || !base) return
  installed = true
  globalThis.fetch = makeOriginAuthFetch(globalThis.fetch, base, secret)
}
