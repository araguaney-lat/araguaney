"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

// El QueryClient se crea una vez por montaje del cliente (useState con
// inicializador perezoso), no en cada render ni a nivel de módulo: a nivel de
// módulo se compartiría entre peticiones en el servidor, mezclando datos de
// usuarios distintos.
//
// Defaults pensados para este panel:
// - staleTime 30s: las listas no cambian cada segundo; evita refetch en cada
//   navegación entre pantallas sin volverse rancio para operación.
// - retry 1: una red de centro puede tener un tropiezo; reintentar una vez
//   ayuda, pero no insistir sobre un error real (un 403 no mejora reintentando).
// - refetchOnWindowFocus false: en un panel operativo, recargar al volver a la
//   pestaña sorprende más de lo que ayuda.
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
