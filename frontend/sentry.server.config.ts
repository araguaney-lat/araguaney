import * as Sentry from "@sentry/nextjs"

import { sentryEnvironment } from "@/lib/sentry-environment"

Sentry.init({
  // El del servidor puede ser distinto al del navegador; si no se define,
  // se usa el público, que es el caso normal de un solo proyecto en Sentry.
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: sentryEnvironment(),
  tracesSampleRate: 0.2,
})
