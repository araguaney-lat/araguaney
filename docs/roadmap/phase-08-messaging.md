### Fase 8 — Mensajería entre usuarios ✅

---

#### Principios de diseño

Canal de comunicación entre pares dentro de una campaña. Complementa las solicitudes (`/dashboard/requests`, usuario → national_admin) con mensajería horizontal: coordinadores que coordinan entre centros, voluntarios que consultan a su coordinador, admins que difunden avisos a su campaña.

**Dos tipos de hilo:**

| Tipo | Quién puede ver | Quién puede responder |
|---|---|---|
| `PRIVATE` | Solo el sender + los destinatarios elegidos | Solo los participantes |
| `PUBLIC` | Todos los miembros de la campaña | Todos los miembros de la campaña |

La pantalla principal muestra dos secciones: "Mensajes privados" y "Mensajes de campaña".

**Scope de campaña — regla de oro:**
- El sender debe pertenecer a `campaign_id`
- En mensajes `PRIVATE`: todos los destinatarios también deben pertenecer a `campaign_id`
- En mensajes `PUBLIC`: visibles para todos los usuarios asignados a esa campaña

**Adjuntos:**
- Tipos permitidos: imágenes (`jpg`, `png`, `webp`), `pdf`, `docx`, `xlsx`
- Validación: content-type + magic bytes en el backend (no solo extensión)
- Máximo por mensaje o reply: 5 archivos, 10 MB cada uno
- Storage: **Cloudflare R2** — sin egress fees, lifecycle rules nativas
- Flujo: frontend pide URL prefirmada al backend → sube directamente a R2 → backend registra la referencia
- TTL configurable via `ATTACHMENT_RETENTION_DAYS` env var (default: 90 días)
- ARQ cron diario borra objetos R2 vencidos + registros en DB

---

#### Modelo de datos

```
Thread
  id UUID PK
  title varchar(200)
  body text
  sender_id UUID FK → users
  campaign_id UUID FK → campaigns
  thread_type: 'PRIVATE' | 'PUBLIC'  (CHECK constraint)
  created_at, updated_at

ThreadParticipant           ← solo para PRIVATE
  thread_id UUID FK
  user_id UUID FK
  last_read_at timestamp nullable
  PK (thread_id, user_id)

ThreadReply
  id UUID PK
  thread_id UUID FK → threads
  sender_id UUID FK → users
  body text
  created_at

ThreadAttachment
  id UUID PK
  thread_id UUID FK nullable     ← adjunto en el mensaje inicial
  reply_id UUID FK nullable      ← adjunto en un reply
  r2_key varchar                 ← clave del objeto en R2
  filename varchar               ← nombre original del archivo
  content_type varchar
  size_bytes integer
  expires_at timestamp           ← calculado al subir: now() + retention_days
  uploaded_by UUID FK → users
  created_at
  CHECK (thread_id IS NOT NULL OR reply_id IS NOT NULL)
```

---

#### Backend — Migración y modelos

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Migración `0NN_messaging` | Tablas `threads`, `thread_participants`, `thread_replies`, `thread_attachments`; índices en `(campaign_id, thread_type)`, `(sender_id)`, `(thread_id)` en replies y attachments; `expires_at` indexado para el cron de purga | 🟠 | ✅ Completado |
| 2 | Modelos SQLAlchemy | `Thread`, `ThreadParticipant`, `ThreadReply`, `ThreadAttachment`; importar en `alembic/env.py` | 🟡 | ✅ Completado |

---

#### Backend — R2 y adjuntos

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 3 | Configuración R2 | Variables de entorno: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`; cliente boto3 con endpoint Cloudflare R2 en `app/utils/r2.py` | 🟡 | ✅ Completado |
| 4 | Endpoint upload presignado | `POST /v1/messages/attachments/upload-url` — valida tipo de archivo permitido + tamaño; genera URL prefirmada de R2 (15 min TTL); retorna `{upload_url, r2_key}`; el frontend sube directo a R2 | 🟠 | ✅ Completado |
| 5 | Endpoint confirmar attachment | `POST /v1/messages/attachments/confirm` — verifica que el objeto existe en R2; crea registro `ThreadAttachment` con `expires_at`; vincula a `thread_id` o `reply_id` | 🟡 | ✅ Completado |
| 6 | Endpoint download presignado | `GET /v1/messages/attachments/{id}/url` — genera URL de descarga prefirmada (1 h TTL); solo para participantes del hilo o miembros de la campaña (PUBLIC) | 🟡 | ✅ Completado |
| 7 | Cron de purga de adjuntos (ARQ) | `purge_attachments_cron` — diario 04:00 UTC; encuentra `expires_at < now()`; elimina objeto en R2 + registro DB; log de cantidad purgada | 🟡 | ✅ Completado |

---

#### Backend — Endpoints de mensajería

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 8 | `POST /v1/messages` | Crear hilo; body: `{title, body, thread_type, campaign_id, recipient_ids[], attachment_r2_keys[]}`; valida scope de campaña para sender y recipients; en PRIVATE crea `ThreadParticipant` por cada recipient + sender | 🟠 | ✅ Completado |
| 9 | `GET /v1/messages` | Listar hilos del usuario; filtro `thread_type=PRIVATE\|PUBLIC`; para PRIVATE: hilos donde el usuario es participante; para PUBLIC: hilos de las campañas del usuario; ordenado por `updated_at DESC`; paginado | 🟡 | ✅ Completado |
| 10 | `GET /v1/messages/{id}` | Detalle del hilo con replies y attachments; valida acceso (participante o miembro de campaña según tipo) | 🟡 | ✅ Completado |
| 11 | `POST /v1/messages/{id}/replies` | Agregar reply; body: `{body, attachment_r2_keys[]}`; valida acceso; actualiza `Thread.updated_at`; activa notificación | 🟡 | ✅ Completado |
| 12 | `PATCH /v1/messages/{id}/read` | Marca hilo como leído (actualiza `ThreadParticipant.last_read_at`); solo PRIVATE; para PUBLIC no hay tracking de lectura | 🟢 | ✅ Completado |

---

#### Backend — Notificaciones

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 13 | Email al crear hilo PRIVATE | Notifica a cada recipient: "Tienes un nuevo mensaje de [Nombre]: [Título]"; link al hilo | 🟡 | ✅ Completado |
| 14 | Email al crear hilo PUBLIC | Notifica a todos los miembros de la campaña (excepto el sender): "Nuevo mensaje en [Campaña]: [Título]" | 🟡 | ✅ Completado |
| 15 | Email al responder | Notifica a todos los participantes (PRIVATE) o miembros de campaña (PUBLIC) excepto quien respondió | 🟡 | ✅ Completado |

---

#### Backend — Auditoría

| Evento | Cuándo | Metadata |
|---|---|---|
| `MESSAGE_CREATED` | Hilo creado | `{thread_type, campaign_id, recipient_count}` |
| `MESSAGE_REPLIED` | Reply agregado | `{thread_id, has_attachments}` |
| `ATTACHMENT_PURGED` | Cron borra adjuntos vencidos | `{count, bucket}` |

---

#### Frontend — Mensajería

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 16 | Página `/dashboard/messages` | Layout de dos columnas: lista de hilos (izq) + detalle/hilo (der); en móvil: lista → toca → detalle a pantalla completa | 🟠 | ✅ Completado |
| 17 | Tabs "Privados" / "Campaña" | Dos pestañas en la lista; badge con conteo de no leídos en Privados (basado en `last_read_at`); en Campaña, ordenado por actividad reciente | 🟡 | ✅ Completado |
| 18 | Formulario de nuevo mensaje | Modal o panel: título, cuerpo, tipo (privado/campaña), selector de campaña, selector de destinatarios (solo si PRIVATE, filtrado por campaña); zona de drop de adjuntos | 🟠 | ✅ Completado |
| 19 | Vista de hilo y replies | Timeline de mensajes con sender, timestamp y adjuntos; caja de reply al pie; botón de adjuntar archivos | 🟠 | ✅ Completado |
| 20 | Upload de adjuntos | Drag & drop o picker; muestra preview de imagen / nombre de archivo; valida tipo y tamaño en cliente antes de pedir URL prefirmada; barra de progreso por archivo | 🟠 | ✅ Completado |
| 21 | Descarga de adjuntos | Botón de descarga por adjunto; llama al endpoint de URL prefirmada y abre en nueva pestaña | 🟢 | ✅ Completado |
| 22 | Indicador de no leídos en sidebar | Badge numérico en "Mensajes" en el sidebar del dashboard; refleja hilos PRIVATE con replies después de `last_read_at` | 🟡 | ⬜ Pendiente |

---

> **Decisiones de diseño:**
> - R2 elegido sobre Cloudinary: sin egress fees y experiencia previa en bioflow del mismo equipo.
> - Subida directa a R2 desde el cliente (presigned URL): el backend nunca recibe el binario, elimina riesgo de timeout en Railway y reduce ancho de banda del servidor.
> - TTL de adjuntos configurable vía `ATTACHMENT_RETENTION_DAYS` env var — no hardcodeado en código. Default 90 días alineado con el retention de auditoría.
> - No hay edición de mensajes ni replies — la inmutabilidad es intencional en un contexto de coordinación humanitaria (trazabilidad de lo que se dijo y cuándo).
> - No hay tiempo real (WebSocket/SSE) — el polling implícito al navegar al hilo es suficiente para el ritmo de trabajo en un almacén.
> - Los hilos PUBLIC no trackean lectura individual — demasiada complejidad para el valor que agrega en este contexto.
