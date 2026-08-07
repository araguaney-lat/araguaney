# Fase 22 — Trazabilidad extendida: avión y destino

> La trazabilidad ya no termina en `SHIPPED`: hitos logísticos discretos (salida
> de depósito, carga al avión, llegada, aduana), recepción en destino
> reconciliada caja por caja con registro de merma, e incidencias (faltantes,
> daños, retenciones, diferencias de peso) con su ciclo de resolución. La
> registra `national_admin` con el reporte del consignatario; las cajas
> despachadas permanecen congeladas: enviado y recibido son dos hechos y el
> sistema guarda ambos.
>
> **Spec:** `docs/superpowers/specs/2026-07-29-extended-traceability-design.md`
> **Premisa validada:** la trazabilidad por eventos discretos ya es la
> arquitectura (`*_event` desde la Fase 3, mismo modelo que GS1 EPCIS); esta
> fase amplía el vocabulario, no el paradigma.
> **Relación:** la diferencia de peso usa la báscula por tarima (Fase 21) si
> existe; "tu donación llegó" al donante es el gancho de la Fase 18 (task 21).

---

## Objetivos

1. Ver dónde está un envío después de despachado: hitos discretos en el timeline.
2. Registrar qué llegó de verdad: recepción reconciliada, merma visible.
3. Convertir cada anomalía (faltante, daño, retención, peso) en una incidencia
   con dueño y resolución, no en un mensaje de WhatsApp perdido.
4. Medir la merma por envío y campaña, espejo del % de rechazo en intake.

## No-objetivos (MVP)

- Cuentas o enlaces firmados para el consignatario (evolución anotada; hoy
  captura `national_admin` con su reporte).
- GPS, telemetría o integraciones con aerolíneas: hitos manuales.
- Fotos en recepción/incidencias (el patrón R2 existe si la operación lo pide).
- Reapertura de envíos reconciliados.

---

## Tareas

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Migración: estados, hitos y tablas de destino | `shipments.status` amplía CHECK con `DELIVERED` y `RECONCILED`; `shipment_events.milestone` (nullable + CHECK con los 7 hitos); tablas `shipment_receptions`, `reception_lines` (outcome RECEIVED\|MISSING\|DAMAGED\|RETAINED_CUSTOMS), `incidents` (type, status OPEN\|RESOLVED). Reversible. | 🔴 Alta | ✅ Done |
| 2 | Repositorios | `ReceptionRepository` + `IncidentRepository`, scoped por el centro del envío (`TenantRepository.scoped()`). | 🟠 Media | ✅ Done |
| 3 | `ShipmentService`: hitos y llegada | `add_milestone` (evento sin cambio de estado, solo en `SHIPPED`+), `mark_delivered` (→ `DELIVERED` + evento). Transiciones inválidas rechazadas. | 🟠 Media | ✅ Done |
| 4 | `ReceptionService`: reconciliación | `reconcile`: checklist pre-llenado `RECEIVED`, excepciones marcadas, peso recibido por tarima opcional → `RECONCILED` + evento. **No muta cajas ni tarimas** (invariante de congelamiento). Auto-incidencias: línea ≠ RECEIVED y diferencia de peso sobre umbral configurable (default 5%). | 🔴 Alta | ⬜ |
| 5 | `IncidentService` | Crear manual (envío/tarima/caja), resolver con nota, listar scoped. Auditoría en cada transición. | 🟠 Media | ⬜ |
| 6 | Routers | Hitos, llegada y recepción: `national_admin`. Lectura e incidencia manual: también `coordinator` del centro emisor. Rate-limited, scoped. | 🟠 Media | ⬜ |
| 7 | UI: timeline e hitos del envío | Detalle de envío muestra hitos intercalados con estados (extiende `StatusTimeline`); botón "registrar hito" con fecha/hora y nota para `national_admin`. | 🟠 Media | ✅ Done |
| 8 | UI: recepción en destino | Checklist de cajas pre-llenado como recibido (solo se marca la merma), pesos por tarima opcionales, confirmación → `RECONCILED`. Resumen de merma del envío. | 🔴 Alta | ⬜ |
| 9 | UI: incidencias | Apartado en el detalle del envío + listado global para `national_admin` (filtro por estado). Crear manual y resolver con nota. Entrada en sidebar de administración. | 🟠 Media | ⬜ |
| 10 | Ficha pública refleja entrega | `/b/[code]` y `/p/[code]` muestran "Entregada en destino" cuando el envío está `DELIVERED`/`RECONCILED` (dato del envío; la caja no se muta). Cache con TTL corto o purga al cambiar estado. | 🟠 Media | ⬜ |
| 11 | Merma en reportes | % de cajas no recibidas por envío y por campaña en el dashboard de reportes; se registra como métrica de éxito en `CLAUDE.md`. | 🟠 Media | ⬜ |
| 12 | Manual de recepción | Guía en `/dashboard/ayuda` para `national_admin`: qué pedir al consignatario (acta, pesos, fotos por fuera del sistema), cómo registrar merma e incidencias. ES/EN. | 🟢 Baja | ⬜ |
| 13 | Tests | Máquina extendida + hitos, congelamiento intacto, auto-incidencias (línea y peso), aislamiento tenant, merma en reportes, transiciones inválidas. | 🔴 Alta | ⬜ |
| 14 | `CLAUDE.md` + roadmap | Actualizar la sección de máquinas de estado (el envío ya no muere en `SHIPPED`) y los totales. | 🟢 Baja | ⬜ |

---

## Orden sugerido

1 → 2 → 3 (hitos primero: valor inmediato sin esperar recepción) → 7 →
4 → 6 → 8 (recepción) → 5 → 9 (incidencias) → 10 → 11 (visibilidad y métricas) →
12 → 13 → 14 (cierre).

## Definition of Done de la fase

- Un envío `SHIPPED` acumula hitos con fecha, usuario y nota, visibles en su
  timeline.
- La recepción se registra marcando solo las excepciones y deja el envío en
  `RECONCILED`; las cajas despachadas no cambian ni un byte.
- Cada faltante, daño, retención o diferencia de peso relevante existe como
  incidencia con estado y resolución.
- La merma aparece por envío y por campaña en reportes.
- La ficha pública de una caja entregada dice que llegó, sin exponer nada nuevo.
- Un envío que nadie recepciona se queda en `SHIPPED` y nada se rompe.
