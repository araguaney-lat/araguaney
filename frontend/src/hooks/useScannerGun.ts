"use client"

import { useEffect, useRef } from "react"

/* Pistola lectora de códigos de barras (HID).
 *
 * Una pistola no es un periférico exótico: se presenta al sistema como un
 * teclado, teclea los caracteres del código y manda Enter. Por eso los campos
 * de texto de Araguaney ya funcionaban con una — siempre que alguien hubiera
 * tocado el campo antes.
 *
 * Ese "antes" es el problema real en un andén. Quien recibe tiene las dos manos
 * ocupadas: una con la caja y otra con la pistola. Obligar a tocar la pantalla
 * entre disparo y disparo convierte una operación de un segundo en tres.
 *
 * Este hook escucha el teclado a nivel de documento y reconoce el disparo por
 * su **velocidad**: una pistola escribe un código entero en decenas de
 * milisegundos, un pulgar no. Así se distingue sin pedirle a nadie que
 * configure nada.
 */

/** Entre dos teclas de una pistola pasan pocos milisegundos. Una persona
 * rápida no baja de ~80 ms sostenidos, así que 50 ms separa las dos cosas sin
 * castigar a un teclado bluetooth lento. */
export const MAX_MS_ENTRE_TECLAS = 50

/** Por debajo de esto es ruido: un atajo, un dedazo, una tecla suelta. Los
 * códigos del dominio (`BX-`, `TM-`, `DN-`) y un GTIN superan esto de sobra. */
export const MIN_LARGO = 4

function escribiendoEnUnCampo(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const etiqueta = target.tagName
  return (
    etiqueta === "INPUT" ||
    etiqueta === "TEXTAREA" ||
    etiqueta === "SELECT" ||
    target.isContentEditable
  )
}

/**
 * Llama a `onScan` cuando una pistola dispara un código con nadie escribiendo.
 *
 * No hace nada mientras el foco esté en un campo: ahí la pistola ya funciona
 * sola y duplicar la lectura crearía dos capturas de un disparo.
 */
export function useScannerGun(onScan: (code: string) => void, enabled = true): void {
  // El callback se lee de una ref para no volver a suscribir el listener en
  // cada render: una suscripción que se rehace a media ráfaga pierde teclas.
  const alEscanear = useRef(onScan)
  alEscanear.current = onScan

  useEffect(() => {
    if (!enabled) return

    let buffer = ""
    let ultima = 0

    const onKeyDown = (e: KeyboardEvent) => {
      if (escribiendoEnUnCampo(e.target)) return

      const ahora = e.timeStamp
      // Una pausa larga cierra la ráfaga anterior: lo que venga es otro disparo.
      if (ahora - ultima > MAX_MS_ENTRE_TECLAS) buffer = ""
      ultima = ahora

      if (e.key === "Enter") {
        const codigo = buffer.trim()
        buffer = ""
        if (codigo.length >= MIN_LARGO) {
          e.preventDefault()
          alEscanear.current(codigo)
        }
        return
      }

      // Solo caracteres imprimibles: las modificadoras y las de función no
      // forman parte de un código.
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) buffer += e.key
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [enabled])
}
