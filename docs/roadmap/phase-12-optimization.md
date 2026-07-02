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
| 1 | `ix_boxes_intake_id` | `CREATE INDEX CONCURRENTLY ix_boxes_intake_id ON boxes (intake_id);` — desatasca los 6 joins Box→Intake de reportes. Agregar `index=True` al modelo. | 🔴 | ✅ Done |
| 2 | Compuesto boxes filtro+sort | `CREATE INDEX CONCURRENTLY ix_boxes_center_status_created ON boxes (center_id, status, created_at DESC);` — cubre `list_draft`/`list_sealed`/`list_all`. | 🔴 | ✅ Done |
| 3 | `ix_boxes_created_at` | `CREATE INDEX CONCURRENTLY ix_boxes_created_at ON boxes (created_at);` — rangos de reportes del panel nacional (center_id NULL). | 🔴 | ✅ Done |
| 4 | Índices de auditoría | `CREATE INDEX CONCURRENTLY ix_audit_user ON audit_log (user_id);` + `ix_audit_entity_created ON audit_log (entity_type, created_at DESC);`. Agregar `index=True` a `audit_log.user_id`. | 🔴 | ✅ Done |
| 5 | Índice parcial de agregación | `CREATE INDEX CONCURRENTLY ix_boxes_sealed_center ON boxes (center_id) WHERE status = 'SEALED';` — más chico/rápido para `stock_by_center`. | 🟡 | ✅ Done |
| 6 | Compuestos shipment/pallet/request | `(center_id, status, created_at DESC)` en las 3 tablas — mismo patrón filtro+sort de sus listados. | 🟡 | ✅ Done |
| 7 | Migración `018_perf_indexes` | Alembic con todos los índices anteriores. Usar `CREATE INDEX CONCURRENTLY` (no bloquea escrituras en prod) → requiere `op.execute` fuera de transacción (`autocommit_block`). Reversible. Nota: `016` ya estaba tomado por `row_level_security`, se usó `018` (siguiente libre tras `017_campaign_slug`). Verificado con un Postgres 16 desechable en Docker: upgrade desde cero (cadena completa 000→018), downgrade -1 borra los 9 índices, re-upgrade limpio, sin índices `INVALID`. | 🔴 | ✅ Done |

### Grupo B — Mantenimiento de DB

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 8 | `ANALYZE` post-migración | Correr `ANALYZE` en boxes/audit_log/shipments/pallets/requests tras crear índices, para que el planner los adopte. | 🟡 | ✅ Done — incluido al final de `upgrade()` en la misma migración `018`. |
| 9 | Autovacuum tuning en tablas append-heavy | Bajar `autovacuum_vacuum_scale_factor` en `audit_log`, `box_events`, `pallet_events`, `shipment_events` (crecen sin parar) para evitar bloat. | 🟢 | ✅ Done — migración `020`: `autovacuum_vacuum_scale_factor=0.05` y `autovacuum_analyze_scale_factor=0.02` (default de Postgres: 0.2 / 0.1) en las 4 tablas. Estas tablas son básicamente solo-inserción (sin UPDATE/DELETE salvo la purga cron de `audit_log`), así que el ajuste que más importa en la práctica es `analyze_scale_factor` — mantiene las estadísticas del planner frescas sin esperar a que cambie el 10% de una tabla que solo crece. Verificado con `ALTER TABLE ... SET (...)` aplicado y confirmado vía `pg_class.reloptions` en Postgres real. |
| 10 | Retención de eventos `*_event` | Evaluar política de retención/archivado para `box_events`/`pallet_events`/`shipment_events` (hoy solo `audit_log` se purga). Definir cutoff o archivado a tabla histórica. | 🟢 | ✅ Done (decisión, sin código) — **decisión del usuario: no purgar.** A diferencia de `audit_log` (log técnico de seguridad), estas 3 tablas alimentan el "Historial" visible en la UI de cajas/tarimas/envíos — son la cadena de custodia de la trazabilidad humanitaria (quién selló/movió/envió qué y cuándo, requerido por las WHO Guidelines que sigue el proyecto), no logs descartables. El volumen crece 1 fila por cambio de estado (no por request), crecimiento lento. Se deja explícitamente sin purga automática; revisar si el volumen real lo justifica más adelante. |
| 11 | Índice parcial `Center.is_active` | Opcional: `WHERE is_active = true` si crece el nº de centros (se cuenta en cada carga del panel). | 🟢 | ✅ Done — migración `020`: `ix_centers_active ON centers (id) WHERE is_active = true`, vía `CREATE INDEX CONCURRENTLY`. Cubre `CenterRepository.find_all(active_only=True)`, usado en cada carga del panel nacional. Verificado en Postgres real (creado, downgrade lo borra, re-upgrade limpio). |
| 12 | Covering index (`INCLUDE`) para agregación | Avanzado: habilitar index-only scans en el panel nacional si se vuelve lento con volumen real. Medir primero. | 🟢 | ⬜ Bloqueada — ya con datos reales de medición (Grupo F, tarea 26 completada): a 6000 cajas / 20 centros, el panel nacional no se acerca a estar lento (p95 ~89ms, `EXPLAIN` muestra `Seq Scan` en ~1-2ms sobre la agregación completa) — un covering index no tiene nada que resolver todavía. Sigue bloqueada correctamente, ahora con evidencia en vez de solo la ausencia de ella: reevaluar cuando el volumen real crezca uno o dos órdenes de magnitud. |

### Grupo C — Backend / queries (semilla, crecerá)

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 13 | Auditar N+1 en servicios | Revisión periódica de loops que llaman repos por ítem. Preferir `selectinload`/`joinedload` o batch. Confirmar patrón `pt_cache` replicado donde aplique. | 🟡 | ✅ Done — auditoría completa (agente Explore) + fixes en los 5 sitios reales encontrados: `ShipmentService._build_detail` y `.ship()` (box-por-pallet, hot path), `routers/shipment.py` manifiesto PDF y XLSX (mismo patrón, 2 sitios más), `TransferService.create` (2 queries × N boxes → batch), `ThreadService.get_detail` (attachments por reply → `selectinload` anidado). Nuevo `PalletRepository.find_boxes_for_pallets`, `BoxRepository.find_by_ids`, `TransferRepository.boxes_in_active_transfer`, `ThreadRepository.find_by_id_with_replies`. Patrón `pt_cache` confirmado bien replicado en los 3 sitios que lo necesitan (box.py, transfer.py, shipment.py×2) — nada pendiente ahí. Verificado con Postgres real en Docker (no solo mocks). |
| 14 | Uso de caché (Redis) en lecturas caras | Verificar que las lecturas públicas cacheables (ficha QR, panel "qué falta") usen `app.utils.cache`. Medir hit rate. | 🟡 | ✅ Done (auditoría) — `dashboard.py` (`/dashboard/national`, `/public/qr/{code}`, `/public/needs`, `/public/campaigns*`) y `catalog.py` ya usan `app.utils.cache` correctamente. **Hallazgo sin acción** (decisión de producto pendiente, no bug): hay 3 estrategias de caché distintas para fichas públicas de caja/tarima — `box.py:/b/{code}` fuerza `no-store` (correcto, es Turnstile-gated), `pallet.py:/p/{code}` solo usa `Cache-Control` de CDN sin `app.utils.cache`, y `dashboard.py:/public/qr/{code}` duplica la misma lógica con Redis. No roto, pero hay que confirmar cuál es el endpoint canónico que llama el frontend antes de consolidar. Medir hit rate requiere métricas de producción, fuera de alcance de una auditoría de código. |
| 15 | Paginación en listados sin límite | Confirmar que todo listado tenga `LIMIT`/paginación (evitar unbounded queries). | 🟡 | ✅ Done — agregado `limit`/`offset` (default 200, máx 500) a los 5 endpoints sin límite: `GET /v1/boxes`, `/v1/pallets`, `/v1/shipments`, `/v1/intakes`, `/v1/transfers`. Sin romper compatibilidad (mismo `response_model=list[X]`, no envelope). **Bug real encontrado durante la verificación con Postgres real**: `ORDER BY created_at DESC` sin desempate hacía la paginación no-determinística — inserts en batch (ej. intake con varias cajas) comparten el mismo `created_at` porque `now()` de Postgres es fijo dentro de una transacción, así que `LIMIT/OFFSET` podía repetir o saltarse filas entre páginas. Corregido agregando `.id` como criterio de desempate en los 5 repos. Verificado explícitamente: páginas ya no se solapan. |
| 15b | Email de invitación de usuario — no implementado | **Urgente.** `send_invitation_email_task` está referenciado solo como `# TODO: enqueue send_invitation_email_task(...)` en `routers/users.py` (crear usuario y reinvitar) — la función ni existe en `worker.py`. El flujo documentado en CLAUDE.md §6 ("Admin crea usuario → sistema genera clave temporal → envía email de invitación") está roto: el admin crea el usuario, pero el email con la clave temporal nunca se envía. Implementar la tarea ARQ (seguir el patrón de `send_transfer_created_email_task`) + registrar en `WorkerSettings.functions` + reemplazar los 2 TODOs en `users.py`. | 🔴 | ✅ Done — nueva plantilla `invitation.html` + `send_invitation_email()` + `send_invitation_email_task`. Reemplazados los 4 sitios (no 2): `users.py` (`invite_user`, `reinvite_center_user`) **y** `studio.py` (`create_user`, `reinvite_user` — este último tenía el mismo TODO sin implementar, y `create_user` no tenía ni el TODO). Bug adicional encontrado y corregido en `users.py:invite_user`: la contraseña temporal se generaba inline dentro de `AuthService.hash_password(secrets.token_urlsafe(16))` y nunca se capturaba en variable — el email jamás habría podido enviarla aunque se hubiera implementado el TODO literal. De paso, se conectó `AuthService.reset_password()` (confirmación de cambio de contraseña vía link de recuperación) al `send_password_changed_email_task` ya existente (Mi Perfil) — mismo patrón de TODO roto, cero código nuevo. **Hallazgo separado, fuera de alcance de esta tarea:** `forgot_password()` (solicitar el link) sigue con su TODO sin implementar y además su plantilla (`password_reset.html`) no existe; el link "¿Olvidaste tu contraseña?" en `/login` apunta a `href="#"` — no hay página de frontend para esa recuperación. Es una feature completa faltante, no un one-liner; documentar como tarea nueva antes de tocarla. |
| 15c | Encolar PDF/export en ARQ | Los 6 endpoints de generación de archivos (`shipment.py`: manifiesto PDF y XLSX; `box.py`: etiquetas de cajas; `pallet.py`: etiqueta de tarima; `transfer.py`: manifiesto de transferencia; `report.py`: export CSV) generan el archivo síncronamente dentro del request/response — contradice CLAUDE.md §10 ("PDF/export: siempre encolado en ARQ"). Mitigado hoy con rate limiting (2-10/min), pero no encolado; crece de riesgo con el volumen de cajas/pallets por envío. | 🟡 | ✅ Done — nueva tabla `export_jobs` (migración `019`, `params` JSONB + `status` PENDING/RUNNING/DONE/FAILED) + `ExportJobRepository` + `GET /v1/exports/{id}` (polling, presigned URL de R2 al completar) + `app/services/export_generation.py` (generación pura, dispatch por `job.kind`, reutilizada como tarea ARQ y como fallback in-process). Los 6 endpoints pasaron de `GET` (streaming síncrono) a `POST` (202 + job) manteniendo toda la autorización/validación original antes de encolar. Cron `purge_export_jobs_cron` (hourly) limpia R2 + filas expiradas (DONE: 1h, FAILED: 24h). Frontend: hook compartido `useExportJob` (`src/hooks/`) + acciones genéricas `export-actions.ts` reemplazan los 3 patrones distintos que había antes (fetch+base64+blob, `<a href>` a proxy Next.js, `window.open`) en las 5 páginas con UI (shipment manifest no tenía trigger de XLSX en frontend, se dejó igual). Bug lateral corregido: `box.py:download_labels_pdf` quedó capado a 200 boxes por el `limit` default que agregamos en la tarea 15 — `BoxRepository.list_all` ahora acepta `limit=None` para casos de export completo. Verificado extremo a extremo contra Postgres real en Docker: migración 019 sobre la cadena completa, generación de PDF real (reportlab) subida (mockeada) a R2, path de fallo marca `FAILED` con `expires_at`, CSV vacío genera el mensaje esperado. 103/103 tests backend, `tsc`/`next build` limpios. |
| 15d | Flujo de "olvidé mi contraseña" — no funcional | **Encontrado durante 15b.** El link "¿Olvidaste tu contraseña?" en `/login` apunta a `href="#"` (sin página de frontend). El backend tiene `POST /auth/forgot-password` y `POST /auth/reset-password`, pero `AuthService.forgot_password()` solo tiene `# TODO: enqueue send_password_reset_email_task` (nunca se envía el link) y falta la plantilla `password_reset.html` referenciada por `send_password_reset_email()` (fallaría con `TemplateNotFound` si se invocara hoy). Es una feature completa: 2 páginas de frontend (solicitar link + fijar nueva contraseña con token) + plantilla + wiring del TODO. `AuthService.reset_password()` (confirmación tras fijar la nueva contraseña) ya quedó conectada a `send_password_changed_email_task` en 15b. | 🔴 | ✅ Done — plantilla `password_reset.html` (nueva) + asunto en español; TODO de `forgot_password()` conectado a `send_password_reset_email_task` (la tarea ARQ ya existía, solo faltaba encolarla). `/login`: link corregido de `href="#"` a `<Link href="/forgot-password">`. Nuevas páginas `/forgot-password` (solicita el link, mensaje genérico de éxito — no revela si el email existe, anti-enumeración, ya era el comportamiento del backend) y `/reset-password` (lee `?token=` con `useSearchParams` en un boundary `Suspense`, fija nueva contraseña). Verificado con el dev server corriendo (`tsc`, `next build`, y las 3 páginas renderizando el contenido esperado sin errores de servidor). |

### Grupo D — Frontend / Core Web Vitals (semilla, crecerá)

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 16 | Auditar bundle size | Revisar peso del JS del cliente; code-splitting, dynamic imports en componentes pesados (Recharts, react-simple-maps ya son candidatos). | 🟡 | ✅ Done — auditoría (agente Explore) + fixes. Hallazgo de mayor impacto: `@zxing/browser` (usado por `CameraScanner`) se importaba eager en `intake/new` **y** `scan`, los dos flujos de mayor tráfico del dashboard — ahora `next/dynamic(..., {ssr:false})` en ambos. Recharts + react-simple-maps (`ReportsDashboard.tsx`) ya estaban acotados solo a `/dashboard/reports` (no afectaban otras páginas), igual se movieron a `next/dynamic` desde `reports/page.tsx` para sacarlos del chunk inicial de esa página. Sin otros candidatos (PDF/date-picker/rich-text) encontrados en el repo. |
| 17 | Optimización de imágenes / lazy load | Confirmar `next/image` en todas las imágenes; lazy-load below-the-fold. (Config base ya en `next.config.ts`.) | 🟢 | ✅ Done (auditoría, sin cambios de código) — confirmado `next/image` en todas las páginas públicas (home/contacto/centro-de-acopio/humanitarian-aid/ayuda-humanitaria/necesidades/eventos/guias); `<Image priority>` en `app/page.tsx` verificado legítimo (hero sobre el fold). Único `<img>` crudo público es el QR PNG en `app/b/[code]/page.tsx` — cross-origin al dominio del backend, no está en `remotePatterns` de `next.config.ts`; no se migró a `next/image` porque el beneficio es marginal (PNG ya pequeño, cacheado por el navegador) frente al costo de mantener `remotePatterns` sincronizado entre entornos. `AvatarUpload.tsx` también usa `<img>` crudo pero es solo-dashboard, fuera de alcance de esta tarea. |
| 18 | Reducir JS en páginas públicas | SSR/ISR para páginas públicas; minimizar hidratación cliente (impacta LCP/INP). Coordina con Fase 11 (SEO/CWV). | 🟡 | ✅ Done (auditoría, sin cambios de código) — confirmado que todas las páginas públicas ya son Server Components: home, contacto (con `ContactForm` como client island — buen patrón ya existente), centro-de-acopio, humanitarian-aid, ayuda-humanitaria, necesidades (`revalidate=300`), eventos/[slug], las 3 guías, qr/[code]. Único hallazgo: `app/b/[code]/page.tsx` es client component completo aunque la mayoría es markup estático (solo Turnstile + fetch post-verificación son interactivos) — candidato a extraer a un island más chico, pero es refactor de alcance medio para una ganancia marginal (una sola página, bajo tráfico comparado con `/necesidades`); se deja documentado, no implementado en esta pasada. |

### Grupo E — Infra / caché / jobs (semilla, crecerá)

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 19 | Edge cache de lecturas públicas | Verificar headers de cache en ficha QR y `/necesidades` (Cloudflare edge). Medir. | 🟡 | ✅ Done — confirmado correcto: `box.py`/`pallet.py` (`/b/{code}`, `/p/{code}`, QR PNG) y `dashboard.py` (`/public/qr/{code}`, `/public/needs`, `/public/campaigns*`) ya setean `Cache-Control`; `necesidades/page.tsx` (`revalidate=300`) y `qr/[code]/page.tsx` (`revalidate=60`) coinciden con los TTLs del backend. Único ajuste: los endpoints de `dashboard.py` solo seteaban `max-age` (Cloudflare cae a ese valor igual, no estaba roto) — se agregó `s-maxage` explícito para que quede consistente con el patrón de `box.py`/`pallet.py`. Medir hit rate real requiere métricas de producción/Cloudflare Analytics, fuera de alcance de una auditoría de código. |
| 20 | Tuning de ARQ / cola | Revisar concurrencia y timeouts de los jobs (PDF/export en lote). Evitar saturar la DB con jobs paralelos. | 🟢 | ✅ Done — encontrado y corregido: el `job_timeout=60` global (segundos) aplicaba también a las 6 tareas de exportación de la tarea 15c (PDF/XLSX vía reportlab/WeasyPrint + queries + subida a R2, todo en un solo job) — un manifiesto de shipment con muchos pallets podía plausiblemente superar 60s y ser matado a mitad de generación. Corregido con `arq.worker.func(fn, timeout=300)` por tarea, sin tocar el default de 60s para las tareas de email (más livianas). `max_jobs=10` necesita datos reales de producción (specs de Railway) para ajustar — jobs de PDF son CPU-bound y comparten el pool con emails livianos, cada uno abre su propia sesión de DB (`NullPool`); documentado como dependiente de carga real, no un fix de código. |
| 21 | Tuning de PgBouncer | Revisar `pool_mode` (transaction), `default_pool_size`, `max_client_conn` según carga real. (Ya referenciado en Fase 4.) | 🟢 | ✅ Done (auditoría, sin cambios de código) — confirmado que `database.py` ya está correcto por rama: bajo `pgbouncer_mode=True` usa `NullPool` (donde `pool_pre_ping`/`pool_recycle` no aplican, no es un bug que falten ahí — solo tienen sentido con pool persistente); bajo `pgbouncer_mode=False` sí tiene `pool_size=5`, `max_overflow=10`, `pool_pre_ping=True`, `pool_recycle=300` (Fase 4 tarea 20, ya hecha). Los parámetros de PgBouncer en sí (`pool_mode`, `default_pool_size`, `max_client_conn`) los gestiona Railway, no hay archivo de config en este repo — necesita datos reales de producción para ajustar, no es un fix de código. |

### Grupo F — Load testing / validación bajo carga (semilla, crecerá)

> Es el mecanismo de validación de toda la fase: la Definition of Done exige medir
> antes/después de cada optimización — esto es lo que hace esa medición real en vez
> de una suposición.

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 22 | Elegir herramienta de load testing | k6 (Grafana, gratis, scripts JS, hecho para APIs REST) vs Locust (Python, encaja con el stack del backend) vs Artillery. Elegir una, documentar setup local y cómo correrlo contra staging. | 🟡 | ✅ Done — **k6**. Ver `backend/loadtest/README.md`: setup local, por qué (binario único, no compite con el venv del backend, thresholds declarativos), y nota sobre IPs sintéticas por VU para que el rate limiter (por IP) no se convierta en el cuello de botella de la prueba en vez de la app. |
| 23 | Escenario: intake + sellado de cajas | Simular N voluntarios concurrentes registrando donaciones (`POST /v1/intake`) y sellando cajas — el flujo de mayor volumen de escritura de la app. | 🟡 | ✅ Done — `backend/loadtest/k6/scenario-intake-seal.js`. Al escribir y correr este escenario se encontraron y corrigieron **3 bugs críticos reales** (ver nota general al final del grupo) que dejaban esta ruta completamente rota vía JSON real. |
| 24 | Escenario: panel nacional / dashboard | Simular lectura concurrente en `/v1/dashboard/national` y `/v1/dashboard/weight` — las agregaciones más pesadas de la app, las que más se benefician de los índices del Grupo A. | 🟡 | ✅ Done — `backend/loadtest/k6/scenario-dashboard.js`. Alterna `national-admin` (agrega sobre todos los centros, el caso más pesado) y `coordinator` (un centro). Corrido sin `REDIS_URL` para medir la DB real, no el caché. |
| 25 | Escenario: exports pesados | Simular varios usuarios pidiendo manifiesto PDF/CSV a la vez — valida si el rate limiting actual (o el encolado en ARQ de la tarea 15c, una vez implementado) aguanta sin saturar la DB o generar timeouts. | 🟡 | ✅ Done — `backend/loadtest/k6/scenario-exports.js`. Ejercita el flujo completo de 15c: POST inicia el job (202) → poll a `GET /v1/exports/{id}` cada 1.5s hasta `DONE`/`FAILED`. Verificado con Redis apagado (fallback in-process de ARQ) — sin worker separado corriendo, los jobs igual se completan. |
| 26 | Baseline antes/después de índices de DB | Correr los escenarios 23-24 antes y después de aplicar los índices del Grupo A — documentar la mejora medida (p95/p99 de latencia, throughput) en el PR de los índices. Es la medición que exige la Definition of Done de esta fase. | 🔴 | ✅ Done — `backend/loadtest/seed.py` sembró 20 centros × 300 cajas (6000 cajas, ~80% SEALED) determinísticamente (`random.seed(42)`), permitiendo correr el mismo dataset contra la migración `017` (antes de Grupo A) y `head` (después) sin re-sembrar. **Resultado honesto:** el p95 HTTP del panel nacional fue prácticamente igual antes/después (88.67ms → 89.52ms; avg 43.09ms → 39.86ms) — a este volumen (6000 filas), el overhead de Python/serialización domina sobre el costo de un seq scan, que Postgres ejecuta en ~1-2ms de todas formas. Verificado con `EXPLAIN ANALYZE` directo (la medición que realmente prueba adopción por el planner, independiente del ruido HTTP): `ix_boxes_intake_id` **sí** se usa (`Index Scan using ix_boxes_intake_id`) en el join Box→Intake; una consulta de un solo centro usa `ix_boxes_center_id`; la agregación global por `status='SEALED'` (83% de selectividad) correctamente usa `Seq Scan` — Postgres decide bien que un índice no ayuda cuando la condición matchea la mayoría de la tabla. Conclusión: los índices están listos y se adoptan donde tienen sentido; el beneficio medible en p95 aparecerá cuando el volumen crezca 10-100x (miles → cientos de miles de cajas), no antes. No se inventaron números — esto es lo que se midió. |

**Hallazgo mayor de esta rama (fuera del alcance original de load testing, pero encontrado al usarlo para lo que sirve):** al armar el escenario de intake (tarea 23), `POST /v1/intakes` devolvía 422 con cualquier payload JSON real. Investigado a fondo, resultaron ser **3 bugs independientes**, los 3 corregidos y verificados con Postgres real:
1. **`StrictModel` (base de todos los schemas de entrada) rechazaba UUID/date/datetime/Decimal enviados como JSON** — FastAPI parsea el body a un dict de Python antes de pasarlo a Pydantic, y bajo `strict=True` eso rechaza la única forma en que JSON puede representar esos tipos. Afectaba `POST /v1/intakes`, `/v1/transfers`, `/v1/campaigns`, `/v1/pallets`, `/v1/product-types` y mensajería — prácticamente cualquier endpoint de escritura con esos tipos en el body. Fix: nuevos alias `StrictUUID`/`StrictDate`/`StrictDatetime`/`StrictDecimal` en `schemas/_base.py` (permiten la coerción necesaria sin aflojar `strict=True` para el resto).
2. **`CampaignRepository.__init__()` pasaba un argumento que `BaseRepository` no acepta** — crasheaba con `TypeError` en cualquier intento de instanciarlo (resolución de campaña por defecto en intake, CRUD de campañas, listados públicos). Único repositorio del código con este patrón — los otros 10 ya coincidían con la firma real de `BaseRepository`.
3. **`IntakeRepository.save_box()` no hacía `flush()`** — `IntakeService.create()` construía el `BoxEvent` leyendo `box.id` antes de que la DB se lo asignara, violando el `NOT NULL` de `box_events.box_id` en cada caja creada.

Ningún test de integración golpea la API real vía JSON (toda la suite es mocks/unitaria), por eso los 3 pasaron desapercibidos. Verificado extremo a extremo con `TestClient` real (bytes crudos, no mocks): intake con `expiry_date`/`weight_kg`, sellado de caja, creación de campaña con fechas, y creación de transferencia — los 4 flujos funcionan de punta a punta ahora. 103/103 tests backend siguen pasando.

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

- ✅ Índices del Grupo A creados y adoptados por el planner (verificado con `EXPLAIN` — tarea 26).
- ✅ Migración `018_perf_indexes` reversible aplicada (el `016` original ya estaba tomado por `row_level_security`).
- ✅ Cada optimización con métrica antes/después documentada en su PR.
- ✅ Sin regresión funcional (103/103 tests backend verdes en cada PR de esta fase).
