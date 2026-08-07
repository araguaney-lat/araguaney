# Fase 25 — Captura sin conexión: cola local y sincronización diferida

> Muchos centros de acopio operan en sótanos y bodegas sin cobertura. Hoy la
> aplicación **abre** sin conexión pero no **guarda**: el service worker ignora
> todo lo que no sea `GET`, así que un `POST /v1/intakes` falla y la captura se
> pierde. Esta fase encola la captura en el dispositivo y la sincroniza cuando
> vuelve la red, sin duplicar inventario al reintentar.
>
> **Spec:** `docs/superpowers/specs/2026-08-07-offline-capture-design.md`
> **Deuda declarada:** la Fase 4 (task 3) dejó el shell cacheado y anotó "sync
> diferido (IndexedDB) en Fase 5". Nunca se hizo; esta es esa deuda.
> **Sobre la app nativa:** de los tres problemas, ser nativo solo resuelve uno
> (la persistencia). La idempotencia y los códigos de caja son de dominio, no de
> plataforma: se construyen aquí y la app nativa los hereda. Esperar no evita el
> trabajo, solo retrasa el arreglo.

---

## Objetivos

1. Que una captura hecha en un sótano llegue al servidor cuando alguien salga.
2. Que reintentar la sincronización nunca duplique inventario.
3. Que una caja capturada sin conexión tenga código y etiqueta en el momento.
4. Que la cola pendiente sea visible y nada se descarte en silencio.

## No-objetivos

- Edición offline de lo ya capturado (se captura o no se captura).
- Sellado, paletizado y envíos sin conexión: dependen del estado de otras cajas.
- Sincronización de lectura (panel nacional, reportes, transferencias).
- Resolución de conflictos: dos capturas no colisionan, cada una crea filas
  nuevas.
- Cifrado de la cola local mientras no haya PII obligatoria en ella.

---

## Tareas

### Idempotencia (va primero: encolar sin esto es peor que no encolar)

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Migración: `capture_id` y códigos reservados | `intakes.capture_id` UUID **unique nullable** (nullable porque las capturas en línea de hoy no lo tienen); tabla `box_code_reservations` (code unique, center_id, reserved_by, used_at, box_id). Reversible. | 🟠 Media | ⬜ |
| 2 | `IntakeService`: idempotencia | Si llega un `capture_id` ya registrado, **devolver el intake existente** con `200` en vez de crear otro. La unicidad la sostiene la base, no una comprobación previa: dos peticiones concurrentes tienen una carrera en medio. | 🔴 Alta | ⬜ |
| 3 | Tests de idempotencia | Mismo `capture_id` dos veces → un intake, cero cajas nuevas. Caso concurrente. La restricción existe en la base. | 🔴 Alta | ⬜ |

### Códigos pre-asignados

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 4 | Reserva de bloques | `POST /v1/boxes/codes/reserve` devuelve N códigos para el centro del usuario. Rate-limited. Un bloque sin usar no es inventario y no aparece en ningún reporte. | 🟠 Media | ⬜ |
| 5 | Consumir un código reservado | El intake acepta un `code` pre-asignado por caja; se marca `used_at` y se liga al `box_id`. Consumirlo dos veces falla. Un código de A no lo consume B. | 🟠 Media | ⬜ |

### Cola en el cliente

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 6 | Catálogo en IndexedDB | Cachear los `ProductType` visibles al iniciar sesión y refrescarlos con conexión. Sin catálogo local no hay captura offline posible. | 🟠 Media | ⬜ |
| 7 | Cola de capturas | IndexedDB (no `localStorage`: 5 MB y síncrono). El `capture_id` se genera **antes** del primer intento y se conserva en la cola: todo reintento lleva el mismo. | 🔴 Alta | ⬜ |
| 8 | Sincronización | Background Sync donde exista; `online` + apertura de la app donde no. **Verificar el soporte actual antes de implementar**, no asumirlo. Tras N fallos, la captura pasa a revisión humana en vez de reintentar para siempre. | 🔴 Alta | ⬜ |
| 9 | La cola es visible | Contador permanente ("3 capturas pendientes"), marca por captura en la lista de recepciones, y aviso al cerrar la app con cola pendiente. Una cola invisible es peor que no tenerla. | 🟠 Media | ⬜ |
| 10 | Rechazos con destino | Una captura que el servidor rechaza por regla de negocio (p. ej. caducidad corta que el cliente no pudo validar) queda **visible para revisión**, nunca descartada. | 🟠 Media | ⬜ |

### Cierre

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 11 | Etiqueta offline | El QR se dibuja en el cliente con el código pre-asignado; el PDF en lote sigue siendo del servidor. | 🟠 Media | ⬜ |
| 12 | Manual y límites | Guía en `/dashboard/ayuda`: qué se puede capturar sin señal, qué no, y el paso que más importa — al salir del sótano, abrir la app y esperar a que el contador llegue a cero. ES/EN. | 🟢 Baja | ⬜ |
| 13 | Tests de cierre | Aislamiento entre centros de los códigos reservados; una captura offline rechazada no se pierde; con conexión permanente el comportamiento es idéntico al de hoy. | 🔴 Alta | ⬜ |
| 14 | `CLAUDE.md` + roadmap | Registrar qué escribe offline y por qué solo la captura; totales. | 🟢 Baja | ⬜ |

---

## Orden sugerido

1 → 2 → 3 (idempotencia completa antes de tocar el cliente) → 4 → 5 (códigos) →
6 → 7 → 8 (la cola) → 9 → 10 (visibilidad) → 11 → 12 → 13 → 14.

El orden no es negociable en su primer tramo: **encolar antes de tener
idempotencia convierte un problema de "se perdió una captura" en uno de
"hay inventario fantasma"**, que es peor y mucho más difícil de detectar.

## Definition of Done de la fase

- Una captura hecha sin conexión llega íntegra cuando vuelve la red.
- Reintentar una sincronización nunca duplica inventario.
- Una caja capturada offline tiene código y etiqueta imprimible en el momento.
- La cola pendiente es visible y nada se descarta en silencio.
- Con conexión permanente, la aplicación se comporta exactamente como hoy.
