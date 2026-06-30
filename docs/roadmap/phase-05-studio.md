### Fase 5 — Studio (panel de administración nacional) 🟡 — 22/38

> Panel exclusivo para `national_admin`: gestión unificada de usuarios, campañas, centros y trazas de auditoría.
> Criterios de aceptación: el `national_admin` puede crear/editar/desactivar usuarios y campañas desde `/studio`; toda acción relevante queda registrada en el log de auditoría; los eventos se purgan automáticamente a los 90 días.

---

#### Estructura de rutas `/studio`

```
/studio                    → hub: accesos rápidos + métricas clave
/studio/users              → listado de usuarios (todos los centros)
/studio/users/new          → crear usuario + asignar centro y rol
/studio/campaigns          → gestión de campañas (mover desde /dashboard/campaigns)
/studio/centers            → gestión de centros   (mover desde /dashboard/centers)
/studio/audit              → log de auditoría con filtros
```

> Las páginas de `/dashboard/campaigns` y `/dashboard/centers` quedan como alias o redirigen a `/studio/*` para no romper flujos existentes.

---

#### Backend — Auditoría

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Migración `008_audit_and_requests` | Tabla `audit_log(id, user_id FK, action, entity_type, entity_id, metadata JSONB, ip, created_at)`; índices en `(entity_type, entity_id)`, `(user_id)`, `(created_at)` | 🟡 | ✅ Hecho |
| 2 | Modelo + repository `AuditLog` | Modelo SQLAlchemy; `AuditRepository.log(user, action, entity)` helper; sin lógica de negocio, solo escritura | 🟢 | ✅ Hecho |
| 3 | Middleware / decorator de auditoría | Utility `fire_audit(background_tasks, action, entity_type, ...)` — fire-and-forget via `BackgroundTasks`; abre sesión propia, no bloquea la respuesta | 🟠 | ✅ Hecho |
| 4 | Cobertura de eventos críticos (operación) | `INTAKE_CREATED`, `BOX_SEALED`, `PALLET_CLOSED`, `SHIPMENT_CLOSED`, `SHIPMENT_SHIPPED`; user create/patch ya cubierto en studio.py | 🟠 | ✅ Hecho |
| 30 | Cobertura de eventos de usuarios | `USER_INVITED` (al crear con clave temporal), `USER_REINVITED`, `USER_PASSWORD_CHANGED`, `USER_ROLE_CHANGED`, `USER_DEACTIVATED`, `USER_ACTIVATED`; `fire_audit` en cada endpoint correspondiente | 🟡 | ⬜ Pendiente |
| 5 | Job de purga automática (ARQ) | Cron ARQ `purge_audit_logs_cron` diario 03:00 UTC; borra `created_at < now() - AUDIT_RETENTION_DAYS(90)`; registrado en `WorkerSettings.cron_jobs` | 🟡 | ✅ Hecho |
| 6 | Endpoint de consulta de auditoría | `GET /v1/studio/audit` — solo `national_admin`; filtros: `entity_type`, `user_id`, `from_date`, `to_date`; paginado (limit/offset); rate-limited | 🟡 | ✅ Hecho |

---

#### Backend — Gestión de usuarios

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 7 | Endpoint listar usuarios (admin) | `GET /v1/studio/users` — devuelve todos los usuarios con `center_id`, `center_role`, `is_active`; filtros por centro, rol y estado | 🟡 | ✅ Hecho |
| 8 | Endpoint crear usuario (admin) | `POST /v1/studio/users` — `national_admin` crea usuarios en cualquier centro; genera clave temporal; envía email de invitación; `must_change_password = true` | 🟠 | ✅ Hecho |
| 9 | Endpoint editar usuario (admin) | `PATCH /v1/studio/users/{id}` — cambiar `center_id`, `center_role`, `is_active`; registrar en auditoría | 🟡 | ✅ Hecho |
| 23 | `must_change_password` en modelo y login | Campo `must_change_password: bool` en `User`; migración `009_must_change_password`; al hacer login con flag activo el backend retorna código especial `PASSWORD_CHANGE_REQUIRED`; el frontend redirige a `/change-password` | 🟠 | ⬜ Pendiente |
| 24 | Endpoint cambio de contraseña (perfil) | `PATCH /v1/users/me/password` — requiere contraseña actual + nueva; limpia `must_change_password`; disponible para todos los roles | 🟡 | ⬜ Pendiente |
| 25 | Endpoint "Reinvitar" | `POST /v1/studio/users/{id}/reinvite` — genera nueva clave temporal, pone `must_change_password = true`, envía email; disponible para `national_admin` (cualquier usuario) y `coordinator` (solo usuarios de su centro) | 🟡 | ⬜ Pendiente |
| 26 | Endpoint crear volunteer (coordinator) | `POST /v1/center/users` — `coordinator` crea usuarios `volunteer` en su propio centro; misma lógica de invitación que el endpoint de Studio | 🟡 | ⬜ Pendiente |

---

#### Frontend — Layout y hub

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 10 | Layout `/studio` | Layout con sub-navegación lateral (Users / Campaigns / Centers / Audit / Requests); guard `national_admin`; separado visualmente del dashboard operativo | 🟡 | ✅ Hecho |
| 11 | Hub `/studio` | Tarjetas de acceso rápido + métricas clave: centros activos, campañas activas, usuarios totales, categorías activas | 🟢 | ✅ Hecho |

---

#### Frontend — Usuarios

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 12 | Listado de usuarios `/studio/users` | Tabla con nombre, email, centro, rol, estado activo/inactivo; filtro por rol; botón de crear; botón "Reinvitar" por fila | 🟡 | ✅ Hecho |
| 13 | Formulario de crear/editar usuario | Campos: nombre, email, contraseña temporal, centro (UUID), rol; edición inline de rol e is_active | 🟠 | ✅ Hecho |
| 27 | Página `/change-password` | Página pública (sin nav) que aparece tras login con `must_change_password`; formulario: nueva contraseña + confirmación; redirige a dashboard al completar | 🟡 | ⬜ Pendiente |
| 28 | Sección de contraseña en perfil | En `/dashboard/profile` (o `/settings`): formulario de cambio de contraseña con contraseña actual; disponible para todos los roles | 🟡 | ⬜ Pendiente |
| 29 | User manager para coordinador | `/dashboard/team` — coordinador ve los volunteers de su centro; botón crear volunteer; botón "Reinvitar" por fila; misma lógica de invitación | 🟡 | ⬜ Pendiente |

---

#### Frontend — Campaña y centros (migración desde /dashboard)

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 14 | Mover campaña a `/studio/campaigns` | Re-export desde `app/studio/campaigns/page.tsx` apuntando a `app/dashboard/campaigns/page.tsx` | 🟢 | ✅ Hecho |
| 15 | Mover centros a `/studio/centers` | Re-export desde `app/studio/centers/page.tsx` apuntando a `app/dashboard/centers/page.tsx` | 🟢 | ✅ Hecho |

---

#### Frontend — Auditoría

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 16 | Log de auditoría `/studio/audit` | Tabla paginada con filtros por tipo de entidad; columnas: fecha/hora, acción, entidad, IP; expandir metadata; paginación | 🟡 | ✅ Hecho |

---

---

#### Solicitudes / Mensajería interna (`/studio/requests`)

> Canal de comunicación entre el equipo operativo (coordinadores y voluntarios) y los administradores en `/studio`.
> Los operadores pueden abrir una solicitud cuando falta algo — un producto, una categoría, un ajuste — y el admin responde desde Studio sin salir de la plataforma.

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 17 | Migración `008_audit_and_requests` | Tabla `requests` + `request_messages`; estados: `OPEN \| IN_PROGRESS \| RESOLVED \| CLOSED` | 🟡 | ✅ Hecho |
| 18 | Endpoints de solicitudes (backend) | `POST /v1/requests`, `GET /v1/requests`, `POST /v1/requests/{id}/messages`, `PATCH /v1/requests/{id}/status` | 🟠 | ✅ Hecho |
| 19 | Botón "Nueva solicitud" en dashboard | En `/dashboard/requests` con formulario de título + descripción | 🟢 | ✅ Hecho |
| 20 | Vista de mis solicitudes (`/dashboard/requests`) | Lista propia con estado, hilo de mensajes, respuesta de seguimiento | 🟡 | ✅ Hecho |
| 21 | Bandeja de solicitudes en Studio (`/studio/requests`) | Vista completa con filtros; hilo por solicitud; cambio de estado | 🟡 | ✅ Hecho |
| 22 | Notificación por email al responder | Email vía Resend al autor cuando `national_admin` responde; template `request_reply.html`; fire-and-forget con `BackgroundTasks` | 🟡 | ✅ Hecho |

> **Nota de diseño:** el hilo es simple e intencional — sin attachments, sin markdown, sin menciones. El objetivo es dar un canal rápido de "me falta X, ¿puedes agregarlo?" sin convertirse en un Slack interno. Los mensajes no se purgan (son evidencia operativa); solo el `audit_log` tiene TTL de 90 días.

---

---

#### Refactor arquitectural — `/studio` → `/dashboard` + nuevo `/studio` para superadmin

> **Decisión de diseño (post-Fase 5):** `/studio` es para el `superadmin` de plataforma, no para el `national_admin`. Todo lo construido en `/studio` para national_admin debe moverse a `/dashboard` con guards por `center_role`. El `/studio` real tendrá contenido diferente para el dueño de la aplicación.

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 31 | Mover rutas de national_admin a `/dashboard` | Renombrar `/studio/users` → `/dashboard/users`; `/studio/audit` → `/dashboard/audit`; `/studio/requests` (bandeja admin) → `/dashboard/requests/admin` o integrado en `/dashboard/requests`; actualizar todos los hrefs del sidebar | 🟠 | ⬜ Pendiente |
| 32 | Sidebar del dashboard — sección Administración | En `Sidebar.tsx` agregar sección "Administración" visible solo para `national_admin`: enlaces a Usuarios, Solicitudes (bandeja), Auditoría | 🟡 | ⬜ Pendiente |
| 33 | Eliminar `StudioSidebar.tsx` y layout `/studio` actual | El layout y sidebar actuales de `/studio` son para national_admin — reemplazar por el nuevo `/studio` de superadmin | 🟡 | ⬜ Pendiente |
| 34 | Nuevo layout `/studio` para superadmin | Guard `users.role = superadmin`; sidebar propio: Métricas, Usuarios, Auditoría, Configuración | 🟡 | ⬜ Pendiente |
| 35 | `/studio` hub — métricas de plataforma | Contadores: centros activos, campañas, usuarios totales, cajas selladas, envíos despachados; visión global sin filtro de centro | 🟡 | ⬜ Pendiente |
| 36 | `/studio/users` — gestión de plataforma | Lista todos los usuarios; puede bloquear/desbloquear (`is_active`); puede crear national_admins; botón "Reiniciar contraseña" para cualquier usuario | 🟠 | ⬜ Pendiente |
| 37 | `/studio/audit` — auditoría de plataforma | Igual que la auditoría de national_admin pero sin filtro de centro — ve todos los eventos de todos los centros | 🟡 | ⬜ Pendiente |
| 38 | `/studio/settings` — configuración del sistema | Variables operativas: `AUDIT_RETENTION_DAYS`, `MIN_SHELF_LIFE_MEDICINE`, `MIN_SHELF_LIFE_FOOD`; no edita `.env`, escribe en tabla `system_settings(key, value, updated_by, updated_at)` | 🟠 | ⬜ Pendiente |

---

> **Decisiones de diseño:**
> - `audit_log.metadata` usa JSONB para capturar contexto variable sin alterar el esquema (ej. `{"from_status": "OPEN", "to_status": "CLOSED"}`).
> - La purga a 90 días se elige como balance entre valor de auditoría y costo de almacenamiento; configurable vía env `AUDIT_RETENTION_DAYS` o tabla `system_settings`.
> - `/studio` = superadmin de plataforma. `/dashboard` con sección "Administración" = national_admin. Coordinadores y volunteers nunca ven rutas admin.
> - "Reiniciar contraseña" (superadmin, national_admin, coordinator) es el mismo mecanismo que "Reinvitar" — genera clave temporal y envía email. El botón se llama igual en todos los user managers.
