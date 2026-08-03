/** Entorno que se reporta a Sentry.
 *
 * `NODE_ENV` no sirve para esto: en Vercel vale `production` también al
 * construir un preview, así que los errores de una rama en revisión caerían
 * revueltos con los de producción y las alertas dejarían de significar algo.
 *
 * `VERCEL_ENV` sí distingue `production`, `preview` y `development`. Fuera de
 * Vercel (desarrollo local, pruebas) no existe y se cae a `NODE_ENV`.
 */
export function sentryEnvironment(): string {
  return (
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    "development"
  )
}
