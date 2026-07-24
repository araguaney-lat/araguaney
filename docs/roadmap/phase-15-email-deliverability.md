# Fase 15 — Deliverability de emails (fallos) + aviso de solicitudes al admin

> Habilitado por el plan pagado de Resend (webhooks + volumen).
> **Spec:** `docs/superpowers/specs/2026-07-24-email-deliverability-admin-notice-design.md`

Captura y muestra los **fallos de entrega** de emails transaccionales (bounce/queja/delay),
correlacionados con lo que los originó, con reenvío; y **avisa por email** al national_admin
(fallback superadmin) cuando entra una nueva solicitud de centro lista para revisar.

---

## Tareas

### Backend

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Modelo `EmailFailure` + migración `029` (solo fallos; dedupe por `svix_id`) + import en `env.py` | ✅ Done |
| 2 | Tags en el envío (`_send(email_type=...)`) en las 14 funciones de `email.py` | ✅ Done |
| 3 | Webhook `POST /webhooks/resend` (sin `/v1`), firma Svix, eximido de `CLOUDFLARE_ONLY` | ✅ Done |
| 4 | `EmailFailureRepository` + `EmailFailureService` (record_event, resend, purge) | ✅ Done |
| 5 | Endpoints `GET /v1/email-failures` + `POST /v1/email-failures/{id}/resend` (superadmin) | ✅ Done |
| 6 | Reenvío: `invitation` (regenera clave) / `center_application_confirm` (regenera token) | ✅ Done |
| 7 | Purge cron (90 días) en el worker | ✅ Done |
| 8 | Aviso al admin: template + `find_review_recipients` + task + encolar en `confirm_email` | ✅ Done |
| 9 | `RESEND_WEBHOOK_SECRET` en config + `.env.example` + `svix` en requirements | ✅ Done |
| 10 | Tests (webhook/record, reenvío, recipients, confirm_email, helpers) | ✅ Done |

### Frontend

| # | Tarea | Estado |
|---|-------|--------|
| 11 | Página `/studio/emails` + `EmailFailuresTable` (reenviar) + item en `StudioSidebar` | ✅ Done |
| 12 | i18n `studio.emails.*` + `studio.nav.emails` (ES/EN) | ✅ Done |

### Infra (manual, post-merge)

| # | Tarea | Estado |
|---|-------|--------|
| 13 | Setear `RESEND_WEBHOOK_SECRET` en Railway (solo backend — el worker no recibe webhooks) | ✅ Done |
| 14 | Dar de alta el webhook en Resend → `https://api.araguaney.lat/webhooks/resend` | ✅ Done |

### Docs

| # | Tarea | Estado |
|---|-------|--------|
| 15 | Guía de integración portable (`docs/integrations/resend-deliverability.md`) para reusar en bioflow/pet-portal | ✅ Done |

> **Verificado end-to-end en producción:** registro a `bounced@resend.dev` → Resend disparó
> `email.bounced` → webhook firmado (Svix) procesado (200) → fila visible en `/studio/emails`
> con botón reenviar.

---

## Definition of Done

- Reglas de negocio cubiertas por test (33 pasan localmente).
- Webhook firmado (Svix); endpoints auth superadmin-only + rate-limited.
- Cambio de estado (`resolved_at`) registrado.
- Migración `029` reversible.
- Sin PII de donante/beneficiario; `RESEND_WEBHOOK_SECRET` por env.
