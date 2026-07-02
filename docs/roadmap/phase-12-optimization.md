# Fase 12 — Optimización y rendimiento

> Fase paraguas para optimizaciones de rendimiento. Arranca con base de datos (índices +
> mantenimiento) tras el review del 2026-07-01, pero está diseñada para **absorber otras
> optimizaciones no relacionadas con DB** conforme aparezcan (backend, frontend, caché, infra).

> Los grupos C-E arrancan con tareas semilla y crecerán con el tiempo.

---

## Objetivos

1. Cerrar los índices faltantes de mayor impacto (reportes, dashboard, auditoría).
2. Establecer procedimientos de mantenimiento (autovacuum, ANALYZE, retención de eventos).
3. Reservar espacio estructurado para optimización de backend, frontend y caché/infra.
4. Toda optimización debe ser medible (antes/después) y reversible.

---

## Review de DB (2026-07-01) — resumen

### Ya estaba bien
- Casi todas las FKs con `index=True`; PKs UUID; unique en `code`/`email`/`username`.
- Pool correcto: `NullPool` detrás de PgBouncer, `pool_pre_ping`, `pool_recycle=300`.
- Sin N+1 en listados (`BoxOut` no anida product_type). PDF de etiquetas ya usa `pt_cache`.
- Purga de `audit_log` por cron. `user_campaigns` con PK compuesta.

### Huecos detectados
| Hallazgo | Tabla | Impacto |
|----------|-------|---------|
| `Box.intake_id` sin índice — 6 joins de reportes escanean | boxes | 🔴 |
| Falta compuesto `(center_id, status, created_at)` — query más común del dashboard | boxes | 🔴 |
| `Box.created_at` sin índice — rangos de reportes (panel nacional) | boxes | 🔴 |
| `audit_log.user_id` sin índice + falta `(entity_type, created_at)` | audit_log | 🔴 |
| Falta índice parcial `WHERE status='SEALED'` para agregación por centro | boxes | 🟡 |
| Mismo patrón filtro+sort sin índice compuesto | shipment/pallet/request | 🟡 |
| Sin autovacuum tuning ni retención en tablas `*_event` | varias | 🟢 |

---

## Tareas

### Grupo A — Índices de DB (alto impacto)

| # | Tarea | SQL / Descripción | Prioridad | Estado |
|---|-------|-------------------|-----------|--------|
| 1 | `ix_boxes_intake_id` | `CREATE INDEX CONCURRENTLY ix_boxes_intake_id ON boxes (intake_id);` — desatasca los 6 joins Box→Intake de reportes. Agregar `index=True` al modelo. | 🔴 | ⬜ Pendiente |
| 2 | Compuesto boxes filtro+sort | `CREATE INDEX CONCURRENTLY ix_boxes_center_status_created ON boxes (center_id, status, created_at DESC);` — cubre `list_draft`/`list_sealed`/`list_all`. | 🔴 | ⬜ Pendiente |
| 3 | `ix_boxes_created_at` | `CREATE INDEX CONCURRENTLY ix_boxes_created_at ON boxes (created_at);` — rangos de reportes del panel nacional (center_id NULL). | 🔴 | ⬜ Pendiente |
| 4 | Índices de auditoría | `CREATE INDEX CONCURRENTLY ix_audit_user ON audit_log (user_id);` + `ix_audit_entity_created ON audit_log (entity_type, created_at DESC);`. Agregar `index=True` a `audit_log.user_id`. | 🔴 | ⬜ Pendiente |
| 5 | Índice parcial de agregación | `CREATE INDEX CONCURRENTLY ix_boxes_sealed_center ON boxes (center_id) WHERE status = 'SEALED';` — más chico/rápido para `stock_by_center`. | 🟡 | ⬜ Pendiente |
| 6 | Compuestos shipment/pallet/request | `(center_id, status, created_at DESC)` en las 3 tablas — mismo patrón filtro+sort de sus listados. | 🟡 | ⬜ Pendiente |
| 7 | Migración `016_perf_indexes` | Alembic con todos los índices anteriores. Usar `CREATE INDEX CONCURRENTLY` (no bloquea escrituras en prod) → requiere `op.execute` fuera de transacción (`autocommit_block`). Reversible. | 🔴 | ⬜ Pendiente |

### Grupo B — Mantenimiento de DB

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 8 | `ANALYZE` post-migración | Correr `ANALYZE` en boxes/audit_log/shipments/pallets/requests tras crear índices, para que el planner los adopte. | 🟡 | ⬜ Pendiente |
| 9 | Autovacuum tuning en tablas append-heavy | Bajar `autovacuum_vacuum_scale_factor` en `audit_log`, `box_events`, `pallet_events`, `shipment_events` (crecen sin parar) para evitar bloat. | 🟢 | ⬜ Pendiente |
| 10 | Retención de eventos `*_event` | Evaluar política de retención/archivado para `box_events`/`pallet_events`/`shipment_events` (hoy solo `audit_log` se purga). Definir cutoff o archivado a tabla histórica. | 🟢 | ⬜ Pendiente |
| 11 | Índice parcial `Center.is_active` | Opcional: `WHERE is_active = true` si crece el nº de centros (se cuenta en cada carga del panel). | 🟢 | ⬜ Pendiente |
| 12 | Covering index (`INCLUDE`) para agregación | Avanzado: habilitar index-only scans en el panel nacional si se vuelve lento con volumen real. Medir primero. | 🟢 | ⬜ Pendiente |

### Grupo C — Backend / queries (semilla, crecerá)

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 13 | Auditar N+1 en servicios | Revisión periódica de loops que llaman repos por ítem. Preferir `selectinload`/`joinedload` o batch. Confirmar patrón `pt_cache` replicado donde aplique. | 🟡 | ⬜ Pendiente |
| 14 | Uso de caché (Redis) en lecturas caras | Verificar que las lecturas públicas cacheables (ficha QR, panel "qué falta") usen `app.utils.cache`. Medir hit rate. | 🟡 | ⬜ Pendiente |
| 15 | Paginación en listados sin límite | Confirmar que todo listado tenga `LIMIT`/paginación (evitar unbounded queries). | 🟡 | ⬜ Pendiente |
| 15b | Email de invitación de usuario — no implementado | **Urgente.** `send_invitation_email_task` está referenciado solo como `# TODO: enqueue send_invitation_email_task(...)` en `routers/users.py` (crear usuario y reinvitar) — la función ni existe en `worker.py`. El flujo documentado en CLAUDE.md §6 ("Admin crea usuario → sistema genera clave temporal → envía email de invitación") está roto: el admin crea el usuario, pero el email con la clave temporal nunca se envía. Implementar la tarea ARQ (seguir el patrón de `send_transfer_created_email_task`) + registrar en `WorkerSettings.functions` + reemplazar los 2 TODOs en `users.py`. | 🔴 | ⬜ Pendiente |
| 15c | Encolar PDF/export en ARQ | Los 6 endpoints de generación de archivos (`shipment.py`: manifiesto PDF y XLSX; `box.py`: etiquetas de cajas; `pallet.py`: etiqueta de tarima; `transfer.py`: manifiesto de transferencia; `report.py`: export CSV) generan el archivo síncronamente dentro del request/response — contradice CLAUDE.md §10 ("PDF/export: siempre encolado en ARQ"). Mitigado hoy con rate limiting (2-10/min), pero no encolado; crece de riesgo con el volumen de cajas/pallets por envío. | 🟡 | ⬜ Pendiente |

### Grupo D — Frontend / Core Web Vitals (semilla, crecerá)

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 16 | Auditar bundle size | Revisar peso del JS del cliente; code-splitting, dynamic imports en componentes pesados (Recharts, react-simple-maps ya son candidatos). | 🟡 | ⬜ Pendiente |
| 17 | Optimización de imágenes / lazy load | Confirmar `next/image` en todas las imágenes; lazy-load below-the-fold. (Config base ya en `next.config.ts`.) | 🟢 | ⬜ Pendiente |
| 18 | Reducir JS en páginas públicas | SSR/ISR para páginas públicas; minimizar hidratación cliente (impacta LCP/INP). Coordina con Fase 11 (SEO/CWV). | 🟡 | ⬜ Pendiente |

### Grupo E — Infra / caché / jobs (semilla, crecerá)

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 19 | Edge cache de lecturas públicas | Verificar headers de cache en ficha QR y `/necesidades` (Cloudflare edge). Medir. | 🟡 | ⬜ Pendiente |
| 20 | Tuning de ARQ / cola | Revisar concurrencia y timeouts de los jobs (PDF/export en lote). Evitar saturar la DB con jobs paralelos. | 🟢 | ⬜ Pendiente |
| 21 | Tuning de PgBouncer | Revisar `pool_mode` (transaction), `default_pool_size`, `max_client_conn` según carga real. (Ya referenciado en Fase 4.) | 🟢 | ⬜ Pendiente |

---

## Notas de implementación

### `CREATE INDEX CONCURRENTLY` en Alembic

`CONCURRENTLY` no puede correr dentro de una transacción. En la migración:

```python
def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_boxes_intake_id ON boxes (intake_id)")
        # ... resto de índices
```

Ventaja: no bloquea escrituras en producción. Desventaja: si falla deja un índice `INVALID` que hay que dropear manualmente. Alternativa: índices normales si se corre en ventana de bajo tráfico.

### Metodología

Toda tarea de esta fase debe:
1. Medir el estado actual (`EXPLAIN ANALYZE` para queries; Lighthouse para frontend).
2. Aplicar el cambio.
3. Medir de nuevo y registrar la mejora en el PR.

Sin medición no hay optimización — solo suposiciones.

---

## Definition of Done (Fase 12)

- Índices del Grupo A creados y adoptados por el planner (verificado con `EXPLAIN`).
- Migración `016_perf_indexes` reversible aplicada.
- Cada optimización con métrica antes/después documentada en su PR.
- Sin regresión funcional (tests verdes).
