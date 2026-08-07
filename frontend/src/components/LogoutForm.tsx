"use client"

import { logoutAction } from "@/lib/actions"
import { clearOfflineData } from "@/lib/offline/db"
import { pendingCount } from "@/lib/offline/queue"

/* Cerrar sesión, limpiando lo que quedó en el dispositivo (Fase 25).
 *
 * Un teléfono de centro se comparte entre turnos. El catálogo descargado y el
 * bloque de códigos apartados son de un centro concreto, y no tienen por qué
 * quedarse esperando a la siguiente persona que entre.
 *
 * **Las capturas pendientes nunca se borran**, y por eso la limpieza no corre
 * si la cola tiene algo: eso sería perder trabajo de alguien, que es
 * exactamente lo que esta fase existe para evitar. Quien cierra sesión con
 * capturas en cola las encuentra intactas al volver a entrar. */
export function LogoutForm({ children }: { children: React.ReactNode }) {
  const cerrar = async () => {
    try {
      if ((await pendingCount()) === 0) await clearOfflineData()
    } catch {
      // Limpiar es higiene, no un requisito para salir: si IndexedDB falla,
      // la sesión se cierra igual.
    }
    await logoutAction()
  }

  return <form action={cerrar}>{children}</form>
}
