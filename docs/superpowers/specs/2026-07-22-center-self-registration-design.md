# Spec — Auto-registro de centros con cola de aprobación

**Fecha:** 2026-07-22 · **Estado:** aprobado

## Contexto / problema

Hoy un centro nuevo entra escribiendo a `hola@araguaney.lat` → un humano (national_admin/
superadmin) crea el `Center` a mano (`create_center`, national_admin-only) e invita al
coordinador. Es tedioso **y** no protege mejor contra centros falsos. Se reemplaza por un
**auto-registro con puerta de aprobación** que quita el trabajo manual pero conserva la
revisión humana.

Decisiones aprobadas (brainstorm 2026-07-22):
- Verificación: **email (doble opt-in) + revisión humana + cuarentena**. Sin SMS/WhatsApp OTP.
- Al aprobar, **el solicitante se vuelve `coordinator`** de su centro (auto-servicio).
- Revisión: **national_admin del país** del solicitante + **superadmin** (ve todas, fallback).
- ⓐ El `Center` se crea **solo al aprobar** (nada de centros fantasma PENDING).
- ⓑ Doble opt-in de email antes de entrar a la cola.
- ⓒ Teléfono opcional (sin OTP). ⓓ Rechazo notifica motivo y permite re-enviar.
- ⓔ `backing_org` (organización que respalda) opcional pero recomendado.

## Cuarentena (decisión de arquitectura clave)

Lo "pendiente" vive en una entidad nueva **`CenterApplication`**, **no** en `centers`. Un
centro no-aprobado **no es un `Center`** → es imposible que aparezca en el panel nacional
agregado o en el "qué falta" público. **No hay que tocar ni filtrar** ninguna query de
agregación/pública. La solicitud ES la cuarentena.

## Máquina de estados (solicitud)

```
PENDING_EMAIL ──confirma email──► PENDING_REVIEW ──approve──► APPROVED
                                        │
                                        └──reject(motivo)──► REJECTED  (puede re-enviar)
```
Cada transición escribe un evento de auditoría.

## Modelo de datos

`CenterApplication` (`app/models/center_application.py`, estilo Column clásico, PK uuid4):
- Centro: `center_name` (req), `country_code` (2, req), `state_name`, `address`.
- Responsable: `contact_name` (req), `contact_email` (req), `contact_phone` (opcional).
- Confianza: `backing_org` (opcional), `social_url` (opcional, validar con `validate_url`),
  `message` (Text, opcional).
- Estado: `status` (String + CHECK: PENDING_EMAIL|PENDING_REVIEW|APPROVED|REJECTED,
  default PENDING_EMAIL).
- Verificación email: `email_verify_token_hash` (hash del token, nunca el token crudo),
  `email_verified_at`.
- Revisión: `reviewed_by` (FK users SET NULL), `reviewed_at`, `reject_reason`.
- Resultado: `created_center_id` (FK centers SET NULL, al aprobar).
- Timestamps `created_at/updated_at`.
- Migración `028_center_applications` + importar el modelo en `alembic/env.py`.

## Backend (reusa lo existente)

- **Repository** `CenterApplicationRepository`: crear, buscar por token, listar cola con
  **scoping por país** (national_admin: `country_code == user.country_code`; superadmin: todo),
  dedupe (ver abajo).
- **Service** `CenterApplicationService`:
  - `submit(data)` → valida, dedupe, crea `PENDING_EMAIL`, genera token (crudo al email,
    hash en DB), encola email de confirmación.
  - `confirm_email(token)` → hashea y compara; marca `email_verified_at` + `PENDING_REVIEW`;
    encola "solicitud recibida".
  - `list_queue(user)` → cola scoped.
  - `approve(app_id, reviewer)` → crea `Center` (activo) + **replica la lógica de `invite_user`**
    (User coordinator: clave temporal, `must_change_password=True`, `is_verified=True`,
    `center_id`, `center_role="coordinator"`, `country_code`; username autogenerado desde el
    email con dedup; asignar a "Donaciones Generales"); set `APPROVED` + `created_center_id`;
    auditoría; encola `send_invitation_email_task`.
  - `reject(app_id, reviewer, reason)` → `REJECTED`; auditoría; encola email de rechazo.
- **Schemas** (`StrictModel`/`StrictORMModel`): `CenterApplicationCreate`, `...Out`,
  `CenterApplicationReject`. Sanitizar inputs con `app.utils.sanitize`.
- **Routers**:
  - Público `/v1/public/center-applications`:
    - `POST ""` — submit. **Turnstile** (header `x-turnstile-token`, como `/b/[code]`) +
      `@limiter.limit` + `get_client_ip`. Nunca cacheado.
    - `GET "/confirm?token=..."` — confirma email (o `POST /confirm`).
  - Auth `/v1/center-applications` (dominio):
    - `GET ""` — cola scoped (national_admin país / superadmin todo). `require_national_admin`
      o equivalente que incluya superadmin.
    - `POST "/{id}/approve"`, `POST "/{id}/reject"` — con scoping (national_admin solo su país).
- **Auditoría**: `CENTER_APPLICATION_SUBMITTED`, `_EMAIL_VERIFIED`, `_APPROVED`, `_REJECTED`.

### Dedupe / anti-abuso
- Bloquear nueva solicitud si existe una `PENDING_EMAIL`/`PENDING_REVIEW` con el mismo
  `contact_email` (case-insensitive) o el mismo `center_name`+`country_code`.
- Turnstile + rate limit en submit. **Doble opt-in**: la solicitud entra a la cola de revisión
  **solo tras confirmar el email** → los bots con emails falsos nunca llegan a la cola.

## Frontend

- **Pública** `/registrar-centro` (+ EN `/en/register-center`) — alta en `ROUTE_SLUGS`
  (URL-locale ES/EN, hreflang). Formulario + **Turnstile**; server action vía `apiFetch`.
  Página de **confirmación de email** (`/registrar-centro/confirmar`).
- **Panel** (`national_admin`, sección Administración): **"Solicitudes de centro"** — lista la
  cola scoped por país, con **aprobar/rechazar** (motivo) y **badge** de pendientes en el nav.
- **Studio** (`superadmin`): la misma cola, viendo todas.
- **CTAs**: home / `/centro-de-acopio` / contacto pasan a apuntar al formulario (se deja
  `hola@` solo para dudas generales).
- i18n ES/EN de páginas + nav (diccionarios).

## Notificaciones (Resend, gratis)

Plantillas nuevas: `center_application_confirm_email`, `center_application_received`,
`center_application_rejected`. Aprobación reusa `invitation.html` (el email de invitación
existente). Revisores: badge en panel (email opcional, fuera del MVP).

## Infra — $0 nuevo

Turnstile, Resend, flujo de invitación, auditoría, rate limiting, ARQ: **todo ya existe**.
No se agrega ninguna dependencia ni servicio de pago. (SMS/WhatsApp OTP quedaría como mejora
futura de pago, fuera de alcance.)

## Testing (pytest, estilo mock del repo + validación real donde aplique)

- `submit` crea `PENDING_EMAIL` + encola email; dedupe bloquea duplicados.
- `confirm_email`: token válido → `PENDING_REVIEW` + `email_verified_at`; token inválido/usado → error.
- `list_queue`: national_admin ve solo su país; superadmin ve todo.
- `approve`: crea Center + User coordinator (must_change_password, asignado a Donaciones
  Generales) + `APPROVED` + `created_center_id` + encola invitación; email ya usado → error.
- `reject`: `REJECTED` + motivo + email; permite re-enviar después.
- Cuarentena: una solicitud pendiente **no** crea Center → no aparece en agregado/público.
- Migración `028` reversible.

## Definition of Done
Reglas cubiertas por tests; acceso a datos por scoping de tenant/país; endpoint público
cacheable-o-rate-limited (submit rate-limited + Turnstile); cambios de estado con auditoría;
migración reversible; sin PII de beneficiarios; nuevas páginas públicas con i18n/hreflang.

## Fuera de alcance
Verificación por SMS/WhatsApp OTP (mejora de pago futura). Aval/referido entre centros
(se puede añadir después sobre este flujo). Autoservicio de national_admin (sigue siendo
superadmin quien los crea).
