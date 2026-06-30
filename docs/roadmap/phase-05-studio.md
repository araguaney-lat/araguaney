### Fase 5 — Studio (panel de administración nacional) ✅

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
| 3 | Middleware / decorator de auditoría | Decorator `@audit("INTAKE_CREATED")` aplicable a cualquier endpoint; captura `user_id`, IP y payload mínimo; nunca bloquea la respuesta (fire-and-forget con `BackgroundTasks`) | 🟠 | ⬜ Pendiente |
| 4 | Cobertura de eventos críticos | Aplicar auditoría a: login/logout, intake, sellado de caja, paletizado, cierre/despacho de envío, creación/edición de usuario, cambio de campaña | 🟠 | ⬜ Pendiente |
| 5 | Job de purga automática (ARQ) | Tarea ARQ periódica (`purge_old_audit_logs`) que borra registros con `created_at < now() - 90 days`; se ejecuta diariamente; sin interacción con el request cycle | 🟡 | ⬜ Pendiente |
| 6 | Endpoint de consulta de auditoría | `GET /v1/studio/audit` — solo `national_admin`; filtros: `entity_type`, `user_id`, `from_date`, `to_date`; paginado (limit/offset); rate-limited | 🟡 | ✅ Hecho |

---

#### Backend — Gestión de usuarios

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 7 | Endpoint listar usuarios (admin) | `GET /v1/studio/users` — devuelve todos los usuarios con `center_id`, `center_role`, `is_active`; filtros por centro, rol y estado | 🟡 | ✅ Hecho |
| 8 | Endpoint crear usuario (admin) | `POST /v1/studio/users` — `national_admin` crea usuarios en cualquier centro; envía email de bienvenida con credenciales temporales | 🟠 | ✅ Hecho |
| 9 | Endpoint editar usuario (admin) | `PATCH /v1/studio/users/{id}` — cambiar `center_id`, `center_role`, `is_active`; registrar en auditoría | 🟡 | ✅ Hecho |

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
| 12 | Listado de usuarios `/studio/users` | Tabla con nombre, email, centro, rol, estado activo/inactivo; filtro por rol; botón de crear | 🟡 | ✅ Hecho |
| 13 | Formulario de crear/editar usuario | Campos: nombre, email, contraseña temporal, centro (UUID), rol; edición inline de rol e is_active | 🟠 | ✅ Hecho |

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
| 22 | Notificación por email al responder | Cuando el admin responde, el autor recibe email; vía Resend | 🟡 | ⬜ Pendiente |

> **Nota de diseño:** el hilo es simple e intencional — sin attachments, sin markdown, sin menciones. El objetivo es dar un canal rápido de "me falta X, ¿puedes agregarlo?" sin convertirse en un Slack interno. Los mensajes no se purgan (son evidencia operativa); solo el `audit_log` tiene TTL de 90 días.

---

> **Decisiones de diseño:**
> - `audit_log.metadata` usa JSONB para capturar contexto variable sin alterar el esquema (ej. `{"from_status": "OPEN", "to_status": "CLOSED"}`).
> - La purga a 90 días se elige como balance entre valor de auditoría y costo de almacenamiento; configurable vía env `AUDIT_RETENTION_DAYS`.
> - El `/studio` es intencionalmente independiente del dashboard operativo para que coordinadores y voluntarios nunca vean rutas de admin.
> - La creación de usuarios por `national_admin` complementa (no reemplaza) la creación por `coordinator` del boilerplate; ambos flujos coexisten.
