/** Entorno que se reporta a Sentry.
 *
 * El orden de precedencia importa y cada escalón existe por una razón:
 *
 * 1. `SENTRY_ENVIRONMENT` gana siempre. Es lo que inyecta la integración de
 *    Vercel con Sentry, y en el proyecto ya hay eventos etiquetados
 *    `vercel-production` y `vercel-preview`. Ignorarla partiría el histórico en
 *    dos juegos de entornos que nombran lo mismo.
 * 2. `NEXT_PUBLIC_VERCEL_ENV` y `VERCEL_ENV` distinguen `production`, `preview`
 *    y `development`. Hacen falta los dos nombres: al navegador solo llegan las
 *    variables con prefijo `NEXT_PUBLIC_`, así que del lado del cliente la
 *    versión sin prefijo no existe.
 * 3. `NODE_ENV` es el último recurso, y solo sirve fuera de Vercel. Ahí vale
 *    `production` incluso al construir un preview, de modo que si el reporte
 *    llega a apoyarse en él, los errores de una rama en revisión caen revueltos
 *    con los de producción.
 *
 * Requisito de configuración: para que el punto 2 funcione en el navegador,
 * Vercel debe tener activado "Automatically expose System Environment
 * Variables", o `NEXT_PUBLIC_VERCEL_ENV` definida a mano. Sin eso el cliente cae
 * al punto 3 en silencio.
 */
export function sentryEnvironment(): string {
  return (
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.SENTRY_ENVIRONMENT ??
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    "development"
  )
}
