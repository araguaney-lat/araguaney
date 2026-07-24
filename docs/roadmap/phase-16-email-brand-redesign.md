# Fase 16 — Rediseño de plantillas de email con identidad de marca

> Importado desde el proyecto Claude Design *Araguaney Emails*
> (vía `DesignSync` MCP → `emails/*.html`).

Reemplaza el estilo minimalista zinc/negro de las plantillas de email por la
**identidad de marca cálida de Araguaney**, y crea el template `verification.html`
que faltaba (crash latente en el worker ARQ).

---

## Tareas

### Rediseño

| # | Tarea | Estado |
|---|-------|--------|
| 1 | Paleta de marca: fondo crema `#F4F1EA`, barra dorada `#F3C033`, header `#FBEFC9`, CTA azul `#1F5E8C` | ✅ Done |
| 2 | Header con mark circular "A" + títulos serif Georgia (sin depender de assets hospedados) | ✅ Done |
| 3 | Preheader oculto por email (texto de preview en la bandeja de entrada) | ✅ Done |
| 4 | `role="presentation"` + `border="0"` en todas las tablas (accesibilidad + compatibilidad) | ✅ Done |
| 5 | Rediseño de las 14 plantillas existentes preservando variables Jinja byte-a-byte | ✅ Done |

### Fix

| # | Tarea | Estado |
|---|-------|--------|
| 6 | Crear `verification.html` faltante (renderizado por `send_verification_email_task`) en estilo de marca | ✅ Done |
| 7 | Enlace de respaldo copiable en el footer de `verification.html` (fallback si el botón no carga) | ✅ Done |
| 8 | Subject de verificación alineado a español (`"Verifica tu correo de Araguaney"`) | ✅ Done |

### Verificación

| # | Tarea | Estado |
|---|-------|--------|
| 9 | Inventario Jinja idéntico al original (mismo `grep` de `{{ }}` / `{% %}`) — condicionales preservados | ✅ Done |
| 10 | Las 15 plantillas renderizan OK en Jinja2 (`select_autoescape`) | ✅ Done |

> **Plantillas afectadas (15):** `invitation` · `verification` · `password_reset` ·
> `password_changed` · `center_application_confirm` · `center_application_received` ·
> `center_application_rejected` · `center_application_admin_notice` · `message_private` ·
> `message_public` · `message_reply` · `request_reply` · `transfer_created` ·
> `transfer_received` · `transfer_status`.

---

## Definition of Done

- Variables Jinja y condicionales (`{% if reason %}`, truncado de `reply_preview`) preservados byte-a-byte.
- Todas las plantillas renderizan sin error (verificado en Jinja2 con autoescape).
- `verification.html` deja de ser un crash latente en el worker ARQ.
- Sin PII de donante/beneficiario introducida.

> **Nota (fuera de alcance):** el enqueue de `send_verification_email_task` sigue como
> `# TODO` en `auth_service.py` — el flujo de verificación no está activo aún, pero el
> template ya existe para cuando se habilite.
