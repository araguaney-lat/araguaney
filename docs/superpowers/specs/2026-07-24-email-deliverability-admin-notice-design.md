# Spec — Deliverability de emails (fallos) + aviso de solicitudes al admin

> Fecha: 2026-07-24
> Estado: aprobado (brainstorm)
> Habilitado por: plan pagado de Resend (webhooks + volumen).

## Problema

1. Los emails transaccionales (invitación, confirmación, reset, mensajes, transferencias)
   son ruta crítica, pero **no hay visibilidad de entregas/rebotes**. Ya hubo un caso de
   fallo silencioso (dominio sin verificar). Si una invitación rebota, nadie se entera.
2. El auto-registro de centros se atora en la **aprobación**: hoy el national_admin solo ve
   un badge in-app cuando entra una solicitud; puede esperar días.

## Objetivos

1. Capturar y **mostrar los fallos de entrega** (bounce/queja/delay) de cualquier email
   transaccional, correlacionados con la entidad que los originó, y permitir **reenviar**.
2. **Avisar por email** al national_admin (o superadmin de fallback) cuando entra una nueva
   solicitud de centro lista para revisar.

## No-objetivos

- No guardar un log de TODOS los emails (solo fallos → footprint mínimo).
- No rastrear aperturas/clicks.
- No acciones automáticas sobre fallos (bloquear/reintentar solo). Solo mostrar + reenvío manual.

---

## Decisiones (del brainstorm)

- **Cobertura:** todos los transaccionales pueden generar un fallo; **solo se persisten fallos**.
- **Correlación:** tags/headers en el envío (`email_type`, `entity_type`, `entity_id`) que Resend
  devuelve en el webhook → sin escritura en DB al enviar, sin fuzzy-match.
- **UI:** sección `/studio/emails` (superadmin).
- **Aviso #2:** email inmediato por solicitud; national_admins del país; si no hay → superadmins.

---

## Arquitectura

### Modelo `EmailFailure` (migración `029`)

`backend/app/models/email_failure.py`, estilo `Column(...)`:

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `UUID(as_uuid=True)`, PK, `default=uuid4` | |
| `resend_email_id` | `String`, index | del payload |
| `to_email` | `String` | destinatario |
| `email_type` | `String` | tag (`invitation`, `center_application_confirm`, …) |
| `entity_type` | `String`, nullable | tag (`user`, `center_application`) |
| `entity_id` | `UUID`, nullable | tag |
| `event_type` | `String` + CHECK `bounced\|complained\|delivery_delayed` | |
| `reason` | `String`, nullable | motivo del bounce |
| `svix_id` | `String`, unique | idempotencia |
| `occurred_at` | `DateTime(timezone=True)` | del evento |
| `resolved_at` | `DateTime(timezone=True)`, nullable | si luego `delivered` o reenvío |
| `created_at` | `DateTime(timezone=True)`, `default=now` | |

Importar en `alembic/env.py`. Migración reversible.

### Envío con tags

`_send(..., tags: list[dict] | None = None)` en `app/email.py` → pasa `tags` a `resend.Emails.send`.
Valores de tag ASCII (`email_type`, `entity_type`, `entity_id` UUID). El destinatario NO va como
tag (Resend restringe `@`); viene del payload del webhook.

Cada `send_*` pasa su `email_type`; los de onboarding pasan además `entity_type`/`entity_id`.
Helper `_tags(email_type, entity_type=None, entity_id=None)`.

### Webhook `POST /webhooks/resend` (sin `/v1`)

`app/routers/resend_webhook.py`, registrado **sin** el prefijo `_V1` (como Stripe), porque lo
llama un tercero con URL fija.

- Verifica firma **Svix** con `settings.resend_webhook_secret` (headers `svix-id`,
  `svix-timestamp`, `svix-signature`). Usa la librería `svix` (agregar a `requirements.txt`).
- Firma inválida → 401.
- `email.bounced` / `email.complained` / `email.delivery_delayed`:
  upsert `EmailFailure` deduplicado por `svix_id` (Resend reintenta). Lee `email_type`,
  `entity_type`, `entity_id` de los tags del payload; `to_email`, `reason`, `occurred_at` del payload.
- `email.delivered`: si existe un `EmailFailure` no resuelto con ese `resend_email_id`
  → set `resolved_at`. Si no hay match → 200 no-op.
- Evento desconocido → 200 ignorado (no reintentar).
- Idempotente (dedupe por `svix_id`).

### Servicio + repositorio

- `EmailFailureRepository`: `upsert_from_event(...)`, `mark_resolved(resend_email_id)`,
  `list_recent(limit, event_type=None)`, `get(id)`, `purge_older_than(days)`.
- `EmailFailureService`:
  - `record_event(payload)` (lógica del webhook).
  - `resend(failure_id)` → según `email_type`:
    - `invitation` → reusa el flujo de reset de contraseña (regenera clave temporal + reenvía) para `entity_id` (user).
    - `center_application_confirm` → nuevo `CenterApplicationService.resend_confirmation(application_id)` (regenera token + reenvía).
    - otros → `api_error("NOT_RESENDABLE", ...)`.
    - marca `resolved_at` al reenviar.

### Endpoints auth (bajo `/v1`)

`app/routers/email_failures.py`:
- `GET /v1/email-failures?event_type=` → lista (solo superadmin; depende de `current_user` + check `role == superadmin`).
- `POST /v1/email-failures/{id}/resend` → dispara reenvío (superadmin).
- Rate-limited con `@limiter.limit`.

### #2 — Aviso al admin

- Template `app/templates/emails/center_application_admin_notice.html` (español, admin-facing,
  con `<meta name="color-scheme" content="light">`), con link a `/dashboard/admin/center-applications`.
- `send_center_application_admin_notice_email(to, center_name, country_code, review_url)` en `email.py`
  (tags: `email_type=center_application_admin_notice`).
- `UserRepository.find_review_recipients(country_code) -> list[str]`:
  emails de `center_role == national_admin` con `country_code == X`; si vacío → `role == superadmin`.
- Worker task `send_center_application_admin_notice_task(ctx, application_id)`:
  carga la solicitud, resuelve destinatarios, envía a cada uno. Fallback in-process registrado.
- En `CenterApplicationService.confirm_email` (tras pasar a `PENDING_REVIEW`), encolar
  `enqueue(bg, "send_center_application_admin_notice_task", str(application.id))`.

### Purga

Cron en `worker.py`: `purge_email_failures_cron` (diario) → `EmailFailureRepository.purge_older_than(90)`.

### Env / infra

- `RESEND_WEBHOOK_SECRET: str = ""` en `config.py` + `.env.example`.
- Configurar el webhook en Resend → `https://api.araguaney.lat/webhooks/resend`.
- El path `/webhooks/*` debe **eximirse** de `CLOUDFLARE_ONLY`/bot-fight (Resend no manda el header
  secreto). Revisar `CloudflareOnlyMiddleware` — si ya exime `/webhooks` (Stripe), reusar; si no,
  agregar el prefijo. Validar en implementación.

### Frontend

- `app/studio/emails/page.tsx` (superadmin) — tabla de fallos con filtro por evento + botón reenviar
  (solo para tipos reenviables). Tokens de tema del studio (azul, como el resto de studio).
- Item "Emails" en `StudioSidebar` (icono `MailWarning`).
- `src/lib/center-application-actions.ts` o nuevo `email-failure-actions.ts`: `listEmailFailures()`,
  `resendEmail(id)` vía `apiFetch` con token.
- i18n `studio.emails.*` (es/en) + el nav label.

---

## Manejo de errores

- Webhook: firma inválida → 401 (no procesa). Evento desconocido → 200 ignorado. `delivered` sin
  match → no-op. Nunca lanza 500 por payload raro (try/except + 200 para no gatillar reintentos infinitos).
- Reenvío de tipo no reenviable → `api_error("NOT_RESENDABLE")`.
- Sin `RESEND_WEBHOOK_SECRET` → el endpoint responde 503 (no se puede verificar) y loguea; no procesa.

## Tests (pytest)

1. Webhook: firma Svix válida → procesa; inválida → 401.
2. Upsert idempotente por `svix_id` (mismo evento 2x → 1 fila).
3. `bounced` con tags → fila con `email_type`/`entity_*` correctos.
4. `delivered` posterior → `resolved_at` seteado.
5. `find_review_recipients`: con national_admin del país → esos; sin national_admin → superadmins.
6. `confirm_email` encola el aviso al admin.
7. Reenvío: `invitation` regenera clave temporal; `center_application_confirm` regenera token; tipo no reenviable → error.
8. Migración `029` reversible (`upgrade`/`downgrade`).

## Definition of Done

- Reglas de negocio cubiertas por test.
- Endpoint webhook firmado (no rate-limit de usuario, la firma es el guard); endpoints auth rate-limited + superadmin-only.
- Cambio de estado (`resolved_at`) registrado.
- Migración `029` reversible.
- Sin PII de donante/beneficiario.
- Sin secretos hardcodeados (`RESEND_WEBHOOK_SECRET` por env).
