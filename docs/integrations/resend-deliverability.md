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
| **Filtro por remitente al recibir** | Un endpoint de webhook está en el alcance de la **cuenta**, no del dominio ni de la clave de API. Si la cuenta es compartida, sin este filtro la tabla se llena con los rebotes del otro producto. Ver abajo. |

## Estado en araguaney: apagado (septiembre 2026)

El webhook está **apagado desde Resend** —el endpoint está desactivado ahí— y
`/studio/emails` **fuera del menú**. La ruta, la API, el modelo, el manejador
del webhook y el filtro de remitente siguen en pie: volver es encender el
interruptor, no reconstruir nada.

**El interruptor es uno solo y vive en Resend.** `RESEND_WEBHOOK_SECRET` se
conserva puesto a propósito: mientras Resend no entrega nada, el secreto no
abre nada. Vaciarlo también habría servido, pero pone el apagado en dos
consolas distintas, y reencender pasaría a ser dos pasos de los que el segundo
es el que se olvida. Un interruptor que se opera desde un solo lugar es el que
se vuelve a encontrar meses después.

El motivo es que el panel de Resend muestra el mismo detalle de entrega y lo
muestra mejor. Mantener una segunda pantalla con los mismos datos obliga a
elegir entre dos fuentes de la misma verdad, y la que se actualiza sola gana.

**Lo que se pierde al apagarlo**, y conviene tenerlo escrito porque no se nota:

- `bounce_watchdog_cron` deja de tener de qué avisar. El panel de Resend es
  pasivo — alguien tiene que ir a mirarlo — y este cron era el único aviso
  activo cuando los rebotes se disparan o se concentran en un proveedor. El
  cron sigue corriendo y no falla; simplemente no encuentra nada, así que **su
  silencio se ve igual que el de todo en orden**.
- El botón de reenvío de `/studio/emails`, que no reenviaba el mismo correo:
  rotaba la contraseña temporal de la invitación. Eso Resend no puede hacerlo.

Si vuelve a hacer falta el aviso de rebotes, el camino es reencender el
webhook, no reconstruirlo.

### Cómo se apaga y cómo se vuelve a encender

| Paso | Apagar | Encender |
|---|---|---|
| Resend → Webhooks | desactivar el endpoint | reactivarlo |
| `frontend/src/lib/nav-config.ts` | sin entrada `/studio/emails` | volver a agregarla a `STUDIO_NAV_ITEMS` |
| Railway (servicio backend) | nada: `RESEND_WEBHOOK_SECRET` se queda puesto | nada |

Vaciar `RESEND_WEBHOOK_SECRET` sigue siendo un apagado válido —el endpoint pasa
a responder 503— y es el camino cuando lo que se quiere es que el backend no
procese webhooks aunque Resend los mande. No es el caso de aquí.

## Una cuenta de Resend compartida entre productos

**Un endpoint de webhook está en el alcance de la cuenta.** No del dominio de
envío, no de la clave de API. Tener un endpoint por producto no reparte los
eventos entre ellos: **duplica**. Cada endpoint recibe todo lo que la cuenta
produce.

La intuición contraria es fácil de tener y difícil de descubrir sola, porque el
síntoma no parece un error: la pantalla de fallos simplemente se llena de
correos que este producto no manda. En un caso medido, el 97 % de las filas
eran de otro producto de la misma cuenta.

Y no es solo cosmético. `bounce_watch` avisa **por volumen** de rebotes, así que
el volumen ajeno dispara el aviso propio: el canal termina reportando la
reputación de un dominio que no es el nuestro.

**El filtro va al recibir, no al leer.** Filtrar en la consulta deja la tabla
creciendo y obliga a repetir la salvedad en cada consulta futura.

**Se filtra por remitente (`data.from`), no por `email_type`.** Dos productos
etiquetan igual justo los tipos que comparten (`verification`,
`password_reset`), así que filtrar por etiqueta dejaría pasar exactamente los
casos ambiguos. El remitente es lo que identifica al producto. Todos los
eventos `email.*` de Resend lo traen, en la forma `"Nombre <buzon@dominio>"` o
`"buzon@dominio"`.

Implementación: `services/email_sender_scope.py` + `EMAIL_OWNED_DOMAINS`.
**Falla abierta**: sin remitente legible, o sin saber cuál es nuestro dominio,
el evento se conserva. Guardar un rebote ajeno se ve y se corrige; perder uno
propio no se nota hasta que alguien no recibió su invitación.

Al portar esto a otro repo de la familia, el filtro es parte del mínimo: los
tres monorepos comparten cuenta.

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
| `config.py` | `resend_webhook_secret: str = ""`, `email_owned_domains: str = ""`. |
| `email.py` | `_send(..., email_type=None)` añade `payload["tags"]=[{"name":"email_type","value":...}]`. Cada `send_*` pasa su `email_type`. |
| `repositories/email_failure_repository.py` | `get_by_svix_id`, `save`, `mark_resolved`, `list_recent`, `purge_older_than`. |
| `services/email_sender_scope.py` | `is_ours(data)` — descarta los eventos de otro producto de la misma cuenta de Resend. |
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
