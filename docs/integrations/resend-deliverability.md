# Resend: tracking de deliverability (fallos) + aviso event-driven

> Guía **portable** para los monorepos FastAPI + Next.js derivados del boilerplate
> (`araguaney`, `bioflow`, `pet-portal`). Implementada primero en araguaney (Fase 15).
> Requiere **plan pagado de Resend** (habilita webhooks). Referencia de implementación:
> `docs/superpowers/specs/2026-07-24-email-deliverability-admin-notice-design.md`.

## Qué te da

1. **Visibilidad de fallos de entrega** (rebote / queja de spam / demora) de cualquier
   email transaccional, **correlacionado con lo que lo originó** (invitación, confirmación…),
   con **reenvío** en la UI para los que aplican.
2. Un patrón reusable de **notificación por email event-driven** (ej. avisar a un admin
   cuando ocurre X), montado sobre la misma infra de worker/email.

## Decisiones de diseño (y el porqué)

| Decisión | Razón |
|---|---|
| **Tabla solo de fallos** (no log de todo) | La API de Resend ya lista los enviados; guardar los 50k éxitos infla la DB sin acción. Los fallos son raros y accionables → footprint mínimo. |
| **Tags al enviar** para correlacionar | Resend devuelve los tags en el webhook → sabes *qué* falló sin fuzzy-match ni escritura en DB al enviar. |
| **Webhook (push), no polling** | La API de Resend no filtra por estado; pollear en cada carga = cientos de llamadas + rate limits. El webhook es más barato y da filtrado instantáneo. |
| **Correlación por `email_type` + destinatario** | Evita threadear `entity_id` por todo el envío; al reenviar se busca la entidad por email. |
| **Dedupe por `svix_id`** | Resend reintenta; el `svix-id` es único por entrega. |

## Arquitectura / flujo

```
enviar email  ──► Resend  ──►  destinatario
   │ tags:{email_type}         │
   │ (sin escribir DB)         ▼
   │                    (rebote/queja/entrega)
   │                           │
   ▼                           ▼
[app]  ◄────── POST /webhooks/resend (firmado Svix) ◄─── Resend
                    │
                    ├─ bounced/complained/delayed → upsert EmailFailure (dedupe svix_id)
                    └─ delivered                  → marca resolved_at

Studio /emails (superadmin) ── GET /v1/email-failures ──► lista de fallos
                            └─ POST /{id}/resend ──► regenera+reenvía (invitación/confirmación)
```

## Componentes (checklist de porting)

Backend (`backend/app/`):

| Archivo | Responsabilidad |
|---|---|
| `models/email_failure.py` | Modelo `EmailFailure` (solo fallos). Import en `alembic/env.py`. |
| `alembic/versions/0NN_email_failures.py` | Migración: tabla + `UNIQUE(svix_id)` + CHECK `event_type` + índices. |
| `config.py` | `resend_webhook_secret: str = ""`. |
| `email.py` | `_send(..., email_type=None)` añade `payload["tags"]=[{"name":"email_type","value":...}]`. Cada `send_*` pasa su `email_type`. |
| `repositories/email_failure_repository.py` | `get_by_svix_id`, `save`, `mark_resolved`, `list_recent`, `purge_older_than`. |
| `services/email_failure_service.py` | `record_event(event, svix_id, data)` (lógica del webhook) + `resend(id, bg)`. Helpers `_tag_value` (list u obj), `_parse_dt`. |
| `routers/resend_webhook.py` | `POST /webhooks/resend` **sin `/v1`**; verifica Svix; nunca 500 en payload raro. |
| `routers/email_failures.py` | `GET /v1/email-failures`, `POST /v1/email-failures/{id}/resend` (superadmin). |
| `main.py` | Registrar routers (`email_failures` con `_V1`, `resend_webhook` sin). **Eximir `/webhooks/` de `CLOUDFLARE_ONLY`.** |
| `worker.py` | Cron de purga (retención N días). |
| `requirements.txt` | `svix==1.42.0`. |

Frontend (`frontend/`):

| Archivo | Responsabilidad |
|---|---|
| `app/<panel>/emails/page.tsx` | Server component: `listEmailFailures()` + tabla. |
| `src/components/EmailFailuresTable.tsx` | Client: tabla + botón reenviar (solo tipos reenviables + no resueltos). |
| `src/lib/email-failure-actions.ts` | Server actions `listEmailFailures` / `resendEmail` (auth + `apiFetch`). |
| sidebar + i18n | Item de nav + diccionarios ES/EN. |

## Webhook: verificación de firma (Svix)

```python
from svix.webhooks import Webhook, WebhookVerificationError
try:
    payload = Webhook(settings.resend_webhook_secret).verify(body, {
        "svix-id": h("svix-id"), "svix-timestamp": h("svix-timestamp"), "svix-signature": h("svix-signature"),
    })
except WebhookVerificationError:
    return Response(status_code=401)
```

Reglas del handler:
- Sin secret → `503` (no se puede verificar).
- Firma inválida → `401`.
- Evento desconocido / `delivered` sin match → `200` no-op (no reintentar).
- Cualquier excepción de procesamiento → `200` + log (evita tormenta de reintentos).

## Env + setup externo

1. `RESEND_WEBHOOK_SECRET` → **solo en el servicio backend** (el worker no recibe webhooks).
2. Resend Dashboard → Webhooks → Add Endpoint:
   - URL: `https://api.<dominio>/webhooks/resend`
   - Eventos: `email.bounced`, `email.complained`, `email.delivery_delayed`, `email.delivered`
   - Copiar el `whsec_...` → pegarlo en `RESEND_WEBHOOK_SECRET`.

### Gotcha: Cloudflare
Si el dominio está detrás de Cloudflare, el **Bot Fight Mode** puede bloquear a Resend en el
edge (antes de llegar al origen), aunque el middleware `CLOUDFLARE_ONLY` ya exima `/webhooks/`.
Si el webhook falla:
- **A:** WAF/bot rule en Cloudflare que permita `/webhooks/resend`, **o**
- **B:** apuntar Resend a la URL directa de Railway (`https://<svc>.up.railway.app/webhooks/resend`).

Verificación rápida (sin firma válida → `401` = secret OK y CF no bloquea; `503` = falta secret; `403` = CF bloquea):
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://api.<dominio>/webhooks/resend \
  -H "svix-id: x" -H "svix-timestamp: 1" -H "svix-signature: v1,bad" -d '{}'
```

## Probar end-to-end (direcciones de simulación de Resend)

Resend simula eventos según el destinatario:
- `bounced@resend.dev` → `email.bounced`
- `complained@resend.dev` → `email.complained`
- `delivered@resend.dev` → entrega OK

Manda cualquier email de la app a esas direcciones (ej. el formulario público de registro con
`bounced@resend.dev`) → debe aparecer en la vista de fallos.

## Porting a otro proyecto (bioflow / pet-portal)

**Igual (viene del boilerplate):** `_send`/worker/`enqueue`, `BaseRepository`, patrón de routers
`/v1`, `CLOUDFLARE_ONLY`, tests mock-based.

**Ajustar por proyecto:**
- `email_type` values = tus templates; qué tipos son **reenviables** y **cómo** (regenerar
  token/clave vs reenvío literal).
- Dónde vive la UI (superadmin/studio vs dashboard admin) y qué rol la protege.
- La correlación de reenvío (por email → tu entidad).
- El companion de notificación (#2) es opcional y específico del dominio.

## Notas de operación aprendidas

- La migración corre sola en Railway si el `CMD` del Dockerfile hace `alembic upgrade head`
  antes de arrancar (backend Online ⇒ migración aplicada).
- **El worker NO necesita `RESEND_WEBHOOK_SECRET`** (no recibe webhooks); sí necesita
  `RESEND_API_KEY`/`MAIL_FROM` para enviar (ya los tiene).
- No hay CI de pytest en el repo (solo security-scan). Los tests se corren en un venv local
  con las deps (`fastapi sqlalchemy pydantic pydantic-settings bcrypt pyjwt jinja2 resend svix
  psycopg2-binary arq slowapi pytest`) + `DATABASE_URL`/`SECRET_KEY` dummy.
