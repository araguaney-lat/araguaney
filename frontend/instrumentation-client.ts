// Inicialización de Sentry en el navegador.
//
// El nombre del archivo no es decorativo: @sentry/nextjs 10 carga
// `instrumentation-client.ts` y ya no lee `sentry.client.config.ts`, que era el
// nombre de versiones anteriores. Con el nombre viejo el archivo existe, se ve
// correcto y nadie lo carga, así que ningún error del navegador llega a Sentry
// por más que el DSN esté bien puesto.
import * as Sentry from "@sentry/nextjs"

import { sentryEnvironment } from "@/lib/sentry-environment"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: sentryEnvironment(),
  tracesSampleRate: 0.2,
  // Solo se graba la sesión cuando hubo error. Grabar de continuo consumiría la
  // cuota gratuita en días y casi todo lo grabado sería tráfico sano.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
  integrations: [Sentry.replayIntegration()],
})

// Instrumenta las navegaciones del App Router. Sin esto, una transición de ruta
// no abre traza y el error aparece huérfano de la navegación que lo provocó.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
