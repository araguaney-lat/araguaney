# Fase 14 — Auto-registro de centros con aprobación

> Reemplaza el alta manual por correo (`hola@araguaney.lat`) con un auto-registro público
> que conserva la revisión humana: solicitud estructurada → confirmación de email →
> cola de aprobación (national_admin del país / superadmin) → al aprobar, se crea el centro
> y el solicitante queda como `coordinator`.
>
> **Spec:** `docs/superpowers/specs/2026-07-22-center-self-registration-design.md`
> **Infra:** $0 nuevo (reusa Turnstile, Resend, flujo de invitación, auditoría, rate limiting).

---

## Objetivos

1. Quitar la fricción del alta (email manual → formulario auto-servicio).
2. Frenar centros falsos con **cuarentena** (la solicitud no es un `Center` hasta aprobar),
   **doble opt-in de email**, **Turnstile + rate limit** y **revisión humana estructurada**.
3. Enrutar la revisión al `national_admin` del país + `superadmin` (ve todas).
4. Al aprobar: crear el centro + invitar al solicitante como `coordinator` (reusa invitación).
5. Páginas públicas del registro con i18n ES/EN + hreflang.

---

## No-objetivos (MVP)

- Verificación por SMS/WhatsApp OTP (mejora de pago futura).
- Aval/referido entre centros (se puede añadir después sobre este flujo).
- Auto-registro de `national_admin` (siguen creándose desde `superadmin`).

---

## Tareas

### Backend

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 1 | Modelo `CenterApplication` + migración `028` | Campos de centro + responsable + confianza (`backing_org`, `social_url`, `message`), `status` (CHECK PENDING_EMAIL\|PENDING_REVIEW\|APPROVED\|REJECTED), `email_verify_token_hash`, `email_verified_at`, `reviewed_by/at`, `reject_reason`, `created_center_id`. Importar modelo en `alembic/env.py`. Reversible. | 🟠 | ✅ Done |
| 2 | `CenterApplicationRepository` | Crear, buscar por token (hash), listar cola con **scoping por país**, dedupe por email/centro+país. | 🟠 | ✅ Done |
| 3 | `CenterApplicationService` | `submit` (dedupe + token + email), `confirm_email` (→ PENDING_REVIEW), `list_queue` (scoped), `approve` (crea Center + coordinator, reusa lógica de `invite_user`, username autogenerado + dedup, asigna a Donaciones Generales), `reject` (motivo). | 🔴 | ✅ Done |
| 4 | Schemas (`StrictModel`) | `CenterApplicationCreate`, `...Out`, `CenterApplicationReject`. Sanitizar inputs; `validate_url` en `social_url`. | 🟡 | ✅ Done |
| 5 | Router público `/v1/public/center-applications` | `POST ""` (submit) con **Turnstile** + `@limiter.limit` + `get_client_ip`, nunca cacheado; `GET/POST /confirm` (verificar email por token). | 🔴 | ✅ Done |
| 6 | Router auth `/v1/center-applications` | `GET ""` cola scoped; `POST /{id}/approve`; `POST /{id}/reject`. Scoping national_admin (su país) / superadmin (todo). | 🟠 | ✅ Done |
| 7 | Auditoría de la solicitud | Eventos `CENTER_APPLICATION_SUBMITTED / _EMAIL_VERIFIED / _APPROVED / _REJECTED`. | 🟡 | ✅ Done |
| 8 | Emails (Resend) | Plantillas `center_application_confirm_email`, `_received`, `_rejected`; aprobación reusa `invitation.html`. Encolar con `enqueue`. | 🟡 | ✅ Done |
| 9 | Tests backend | submit + dedupe, doble opt-in (token válido/inválido/usado), scoping de cola, approve (crea Center + coordinator + invitación), reject + re-envío, cuarentena (pendiente no aparece en agregado), migración reversible. | 🔴 | ✅ Done |

### Frontend

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 10 | Página pública `/registrar-centro` (+ EN `/en/register-center`) | Formulario (datos del centro + responsable + confianza) con **Turnstile**; alta en `ROUTE_SLUGS` (URL-locale + hreflang); server action vía `apiFetch`. | 🟠 | ✅ Done |
| 11 | Página de confirmación de email | `/registrar-centro/confirmar` — consume el token y muestra estado (confirmado / inválido / ya usado). ES/EN. | 🟡 | ✅ Done |
| 12 | Panel: cola "Solicitudes de centro" (national_admin) | Sección Administración: lista scoped por país + **aprobar/rechazar** (motivo) + **badge** de pendientes en el nav. | 🟠 | ✅ Done |
| 13 | Studio: cola para superadmin | La misma cola, viendo todas; aprobar/rechazar. | 🟡 | ✅ Done |
| 14 | Redirigir CTAs al formulario | Home / `/centro-de-acopio` / contacto apuntan al formulario en vez de `hola@` (que queda solo para dudas generales). | 🟢 | ✅ Done |
| 15 | i18n ES/EN | Diccionarios de las páginas nuevas + labels del nav/cola. | 🟡 | ✅ Done |

### Docs

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 16 | Manual "Solicitudes de centro" (ES/EN) | Manual de ayuda del módulo para el national_admin (`/dashboard/ayuda`), en ambos idiomas. | 🟢 | ⬜ Pendiente |
| 17 | Actualizar roadmap README | Totales del índice al completar la fase. | 🟢 | ✅ Done |

---

## Definition of Done (fase)

- Regla de negocio cubierta por test (pytest).
- Acceso a datos por scoping de tenant/país (cola no filtra entre países).
- Endpoint público de submit: rate-limited + Turnstile, nunca cacheado; verificación de email por token hasheado.
- Cada cambio de estado escribe su evento de auditoría.
- Migración `028` reversible.
- Sin PII de beneficiarios; el responsable del centro es contacto operativo, no donante.
- Nuevas páginas públicas con i18n/hreflang.
