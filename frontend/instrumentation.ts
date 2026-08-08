// Instrumentación del servidor y del edge.
//
// Desde Next 15 este es el archivo que Next ejecuta al arrancar cada runtime, y
// sin él la configuración de Sentry del servidor queda escrita pero sin correr.
import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
    // Las llamadas del servidor a Railway van directas (sin Cloudflare), así que
    // añaden el secreto de origen ellas mismas para sobrevivir a CLOUDFLARE_ONLY.
    const { installBackendOriginAuth } = await import("./src/lib/backend-origin-auth")
    installBackendOriginAuth()
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

// Errores lanzados al renderizar en el servidor. No pasan por el SDK del
// navegador —nadie los ve del lado del cliente— ni por un handler de la API:
// este hook es la única vía por la que llegan a Sentry.
export const onRequestError = Sentry.captureRequestError
