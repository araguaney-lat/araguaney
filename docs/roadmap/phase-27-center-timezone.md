# Fase 27 — De quién es el día: zona horaria del centro

> Un reporte dice "las cajas de hoy" y hay que poder responder de quién es ese
> hoy. Hoy la respuesta es UTC, así que para un centro en Monterrey el día del
> reporte empieza a las 18:00 del día anterior: lo capturado el jueves por la
> tarde aparece en la barra del viernes. Nadie ha reclamado y por eso conviene
> escribirlo antes de que alguien lo descubra frente a una cifra que no cuadra.
>
> **De dónde sale esta fase.** Del arreglo de `_resolve_dates` (2026-09-05),
> que corrigió una incoherencia real —el corte del día salía del reloj del
> proceso y los límites se interpretaban en UTC— y dejó a la vista la pregunta
> que ese arreglo no resuelve: UTC es coherente, pero no es el calendario de
> quien opera.
>
> **Costo:** una columna, una migración, un campo en dos formularios y la
> reescritura de la agrupación por día de los reportes. Sin servicios nuevos.

---

## Objetivos

1. Que un reporte de un centro corte los días en el calendario de ese centro.
2. Que dos personas que miran el mismo centro vean los mismos números, estén
   donde estén.
3. Que la regla de vida útil mida contra el calendario de quien tiene la caja
   en la mano.
4. Decir en voz alta qué sigue siendo UTC y por qué, en vez de dejarlo implícito.

## No-objetivos

- **Tomar la zona del dispositivo como fuente de verdad.** Ver abajo: es la
  propuesta obvia y es la equivocada.
- Un día común para el agregado nacional. No existe: la plataforma opera en
  países con husos distintos y "el total nacional del martes" es una
  aproximación se elija lo que se elija. Se declara, no se resuelve.
- Horarios de verano históricos ni reconstruir reportes viejos. La zona se
  aplica de aquí en adelante; los datos guardados no se tocan.

---

## Por qué la zona vive en el centro y no en el dispositivo

La propuesta natural es que la aplicación mande su zona horaria: el teléfono la
conoce, el navegador también, y agrupar por ella es un `AT TIME ZONE` en
Postgres. Es fácil y es la respuesta equivocada, por tres razones que conviene
dejar escritas para que nadie las vuelva a descubrir.

**El día pertenece al centro, no a quien mira.** Una administración nacional
revisando desde Madrid el reporte de un centro en Monterrey vería los días
cortados en horario de Madrid. Dos personas mirando el mismo centro obtendrían
números distintos, y eso es peor que el UTC de hoy: al menos el UTC está igual
de desalineado para todo el mundo. Un reporte describe lo que pasó en un lugar,
no dónde está parado quien lo lee.

**Para la fecha de captura no se puede.** `_capture_date()` alimenta la regla de
vida útil, que decide si una caja se acepta o se rechaza. Si esa fecha viniera
del cliente, cambiar la zona horaria del teléfono movería la frontera de
aceptación: sería una validación con un insumo que controla quien la va a pasar.
Las validaciones se aplican en el backend, y esta no es la excepción.

**`country_code` no alcanza para deducirla.** El centro ya tiene el país, pero
México tiene cuatro husos. El campo va explícito; el país sirve para acotar la
lista al elegirlo, no para adivinarla.

Donde el dispositivo **sí** ayuda es como valor sugerido al dar de alta un
centro: `Intl.DateTimeFormat().resolvedOptions().timeZone` en el navegador y su
equivalente en el teléfono dejan el formulario pre-llenado con
`America/Monterrey` y nadie tiene que buscarla en una lista de seiscientas.
Sugerencia, no fuente de verdad — el mismo patrón que la lectura de etiqueta.

---

## La trampa del dialecto, que aquí muerde

`date_trunc` no existe en SQLite y las pruebas corren en SQLite. La regla del
repositorio aplica entera: si una consulta sostiene una cifra que alguien va a
leer, que no dependa del dialecto. La agrupación por día ya la esquivó una vez
—`activity()` usa `func.date` y normaliza en Python—, y la versión con zona
horaria tiene que esquivarla otra vez o las pruebas dejarán de vigilar
justamente el cálculo que esta fase cambia.

---

## Tareas

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Columna `timezone` en `Center` | Nombre IANA (`America/Monterrey`), nullable con `UTC` como comportamiento por omisión mientras esté vacía. Se valida contra `zoneinfo` al escribir: un nombre inventado tiene que fallar en el formulario y no meses después en una consulta. Migración reversible. | 🟢 Baja | ⬜ Pendiente |
| 2 | Captura y sugerencia en el alta del centro | Campo en el formulario de la administración nacional, junto a país y estado, que es de donde ya salen los otros datos del centro. Pre-llenado con la zona del navegador; la lista se acota por `country_code`. | 🟠 Media | ⬜ Pendiente |
| 3 | Los reportes cortan en la zona del centro | `_resolve_dates` y los límites del repositorio dejan de asumir UTC y usan la zona del centro consultado. Sin depender del dialecto, por lo de arriba. Un centro sin zona sigue en UTC, así que nada cambia hasta que alguien la capture. | 🔴 Alta | ⬜ Pendiente |
| 4 | La fecha de captura usa la zona del centro | `_capture_date()` recibe el centro. Es una mejora real sobre UTC: la vida útil pasa a medirse contra el calendario de quien tiene la caja delante. La frontera se mueve como máximo un día y solo para centros con zona capturada. | 🟠 Media | ⬜ Pendiente |
| 5 | El agregado nacional declara su día | Sigue en UTC porque no hay otro posible, y la pantalla lo dice en vez de dejar que se lea como el día local. Un número que no admite su unidad es un número que alguien va a citar mal. | 🟢 Baja | ⬜ Pendiente |
| 6 | Pruebas de la frontera | Un centro en `America/Monterrey`, una captura a las 19:00 locales, y la afirmación de que cae en el día local y no en el siguiente. Con instante fijo: con el reloj real la prueba solo fallaría durante las horas en que los dos días diferen. | 🟠 Media | ⬜ Pendiente |

---

## Lo que esta fase no arregla, dicho a propósito

Un envío cruza husos y un centro puede mudarse. Nada de eso se modela: la zona
es un dato del centro hoy, no una historia. Si un centro cambia de zona, los
reportes viejos se recalculan con la nueva y nadie guarda cuál se usó entonces.
Es aceptable porque la diferencia es de horas en una frontera de día, y llevar
el historial costaría más de lo que corrige. Queda escrito para que sea una
decisión y no un descuido.
