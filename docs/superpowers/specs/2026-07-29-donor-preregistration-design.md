# Pre-registro de donaciones por el donante — Diseño

**Fecha:** 2026-07-29
**Fase:** 18 (`docs/roadmap/phase-18-donor-preregistration.md`)
**Estado:** aprobado en sesión de brainstorming

---

## Problema

Todo lo que llega a un centro se inventaría a mano en el momento de la entrega: quien
recibe teclea renglón por renglón mientras el donante espera. El centro no sabe qué
viene en camino y el donante no sabe qué pasó con lo que dejó.

**Producto.** El donante registra su donación desde casa, obtiene un QR, y el centro
lo escanea al recibirla: el doble check reemplaza a la captura desde cero. El registro
del donante se convierte en el intake pre-llenado.

Esto introduce el primer dato personal de donantes en el sistema (nombre + email
verificado), lo que revierte el NO-objetivo #4 del `CLAUDE.md` ("no se registran
datos personales del donante"). La reversión se documenta ahí y en el aviso de
privacidad como parte de la fase.

## Decisiones tomadas

| Decisión | Elección | Por qué |
|---|---|---|
| Identidad del donante | **Registro ligero sin contraseña**: nombre + email verificado (doble opt-in); gestión por enlace firmado que llega por email | Mínima PII y superficie de ataque; cero fricción para quien dona una vez; sin login/reset/lockout que mantener. Semilla para cuentas plenas si algún día hacen falta |
| Qué registra | **Renglones sueltos**: catálogo (autocompletado) o texto libre; sin cajas, lotes ni caducidades | Un particular no empaca cajas homogéneas ni conoce el catálogo INN. El centro convierte renglones en cajas reales durante el intake |
| Ciclo de edición | El donante edita hasta que el centro recibe (`REGISTERED`); desde `RECEIVED` solo el centro | El inventario del centro es la única verdad después de la entrega; evita conflictos de edición concurrente |
| Centro destino | El donante **elige** centro (señal de volumen entrante), pero **cualquier centro puede recibir** el QR | La gente termina yendo a donde puede; el pre-registro no debe morir por cambiar de centro. Scoping real = centro que recibe |
| Campaña | El donante **elige campaña opcionalmente** de las públicas; la asociación vinculante la hace el intake en la recepción | El intake ya exige campaña (default Donaciones Generales) y quien recibe debe ser miembro: lo del donante solo puede ser sugerencia. Elegir le da contexto ("dono al terremoto X") y a reportes la señal de intención |
| Visibilidad de campañas | `campaigns.is_public` controla qué campañas ven los donantes; se gestiona desde el gestor de campañas | Hay campañas internas no ligadas a eventos que no deben listarse públicamente. Hoy la visibilidad era implícita (tener `slug`); pasa a ser explícita |

## Modelo de datos (5 tablas nuevas; el modelo actual no cambia)

```
donors        ← esquema UNIFICADO con la Fase 19 (identidad de donante en intake);
                la primera fase que arranque crea la tabla completa
  id, donor_type CHECK (fisica|moral) default 'fisica',
  source CHECK (self|center)  — self: pre-registro (esta fase) / center: capturado en intake,
  center_id FK nullable       — null para self; el centro dueño para center,
  first_name, last_name       — persona física, o representante de la moral,
  legal_name nullable         — razón social (solo moral),
  email nullable              — obligatorio en autoservicio (es la identidad) y
                                en moral; opcional en física capturada en centro,
  phone nullable              — obligatorio en moral, opcional en física,
  email_verified_at, email_verify_token_hash   — solo aplican a source=self,
  created_at, updated_at
  Unicidad (índices parciales, WHERE email IS NOT NULL):
    email único global entre source=self;
    único por (email, center_id) entre source=center
  (ver docs/superpowers/specs/2026-07-29-structured-donor-identity-design.md)

donations
  id, code (unique, "DN-" + secrets, → QR), donor_id FK,
  intended_center_id FK nullable, intended_campaign_id FK nullable,
  received_center_id FK nullable,
  status CHECK (PENDING_EMAIL|REGISTERED|RECEIVED|CANCELLED|EXPIRED),
  manage_token_hash, manage_token_expires_at,   ← el enlace de gestión es
  intake_id FK nullable (se liga al recibir),     por donación, no por donante
  notes, created_at, registered_at, received_at

donation_items
  id, donation_id FK, product_type_id FK nullable, free_text nullable
  (CHECK: exactamente uno de los dos), quantity, unit,
  added_by CHECK (donor|center),
  reception_status CHECK nullable (RECEIVED|MISSING|REJECTED),
  created_at

donation_photos
  id, donation_id FK, storage_key (R2), content_type, size_bytes,
  uploaded_by CHECK (donor|center), created_at

donation_events
  id, donation_id FK, user_id FK nullable (null = acción del donante),
  from_status, to_status, note, ts
```

**Cambio en una tabla existente:** `campaigns.is_public` (Boolean, default `false`;
la migración lo pone en `true` donde ya hay `slug`, preservando el comportamiento
actual de `/eventos/[slug]`). Las campañas internas quedan invisibles para el
público sin tocar nada más.

Convenciones del proyecto: PK `UUID(as_uuid=True)` con `default=uuid.uuid4`,
timestamps con timezone, estados como `String` + CHECK (no ENUM), migración Alembic
reversible encadenada, modelos importados en `alembic/env.py` y en
`app/models/__init__.py`.

**Estados de `Donation`:**

```
PENDING_EMAIL ──confirmación──► REGISTERED ──doble check──► RECEIVED
      │                             │
      └── purga 7 días → EXPIRED    └── donante cancela → CANCELLED
```

Todo cambio de estado escribe un `DonationEvent` (patrón `BoxEvent`).

## Flujo del donante (público, sin contraseña)

1. **`/donar`** — nombre, email, centro al que piensa ir (selector de centros
   activos), campaña **opcional** (solo activas y públicas; sin elegir →
   Donaciones Generales), renglones (autocompletado sobre `/v1/catalog/search` +
   texto libre), fotos opcionales. Turnstile obligatorio; `slowapi` en el endpoint.
2. **Doble opt-in** — email con enlace de confirmación (token `secrets.token_urlsafe(32)`,
   solo hash en DB, single-use). Patrón calcado de `CenterApplicationService`.
   Sin confirmar en 7 días → `EXPIRED` y purga de PII (tarea de retención).
3. **Al confirmar** — `REGISTERED`; email con el QR (PNG inline) y el **enlace de
   gestión**: token propio, hasheado, expira a 30 días, regenerable (reenvío con
   Turnstile; el token anterior muere).
4. **Gestión** (`/donacion/{token}`) — mientras `REGISTERED`: editar/añadir/quitar
   renglones, subir/quitar fotos, cancelar. Desde `RECEIVED`: solo lectura + estado.
5. **QR** → **`/d/{code}`** — ficha pública mínima: estado, centro elegido, resumen de
   renglones (producto y cantidad). **Sin ningún dato del donante.** Cacheable en el
   edge como `/b/` y `/p/`.

## Campañas públicas

- **`GET /v1/campaigns/public`** — solo `is_active AND is_public`; sin auth,
  rate-limited, cacheable en el edge (lectura pública, regla de la arquitectura).
- **`/eventos`** — índice público que lista esas campañas y enlaza las fichas
  `/eventos/[slug]` que ya existen. Sirve al donante para decidir y a la página
  aunque nadie done.
- **`/eventos/[slug]`** — pasa a responder 404 para campañas no públicas (hoy
  cualquier campaña con slug es alcanzable).
- **Gestor de campañas** (`/dashboard/campaigns`, `national_admin`) — toggle
  "mostrar en la página pública" al crear y editar. Campañas internas: toggle
  apagado y no aparecen en `/donar` ni en `/eventos`.

## Flujo del centro (autenticado)

6. **Escáner** — `/dashboard/scan` ya enruta por prefijo (`/b/`, `/p/`); aprende
   `/d/` y `DN-` → vista de recepción.
7. **Vista de recepción** (`/dashboard/donations/[code]`) — renglones + fotos + doble
   check por renglón (recibido / faltante / rechazado), añadir renglones que vinieron
   de más (`added_by = center`). Confirmar →
   - `status = RECEIVED`, `received_center_id` = centro del usuario (via
     `tenant_scope`; un `national_admin` elige centro),
   - se abre el **intake de siempre pre-llenado**: renglones con `product_type_id`
     resuelto → `BoxDraft`s sugeridos; los de texto libre los mapea el coordinador ahí
     mismo (buscar en catálogo o crear el tipo). La campaña llega pre-seleccionada
     con `intended_campaign_id` (o Donaciones Generales); quien recibe la confirma o
     la cambia — el intake es la única asociación vinculante. El intake creado queda
     ligado (`donation.intake_id`): trazabilidad donante → cajas → tarima → envío.
8. **Listado** — `/dashboard/donations`: pendientes dirigidas a mi centro (señal de
   volumen entrante) + recibidas por mi centro. `national_admin` ve todas.

## Emails al donante (Resend, plantillas de marca de Fase 16)

| Evento | Contenido |
|---|---|
| Alta | Confirma tu email (doble opt-in) |
| Confirmado | Tu QR + enlace de gestión + qué esperar en el centro |
| Recibida | Resumen del doble check: qué se recibió, qué faltó, qué se rechazó y por qué |
| (Opcional, no MVP) | "Tu donación salió en un envío" — requiere propagar estado desde cajas |

## Seguridad

- **Anti-bot:** Turnstile en alta y en reenvíos; `slowapi` en todos los endpoints
  públicos (alta, confirmación, reenvío, ficha, gestión, subida de fotos); todo
  detrás de Cloudflare (WAF + rate limiting de edge ya activos).
- **Tokens:** solo hashes en DB (SHA-256, como Fase 14); verificación single-use;
  gestión con expiración 30 días y rotación al regenerar.
- **Anti-enumeración:** `code` aleatorio no secuencial; `/d/{code}` responde
  idéntico (404 genérico) para inexistente y para cualquier error; la ficha pública
  no expone PII, la gestión exige el token.
- **Fotos:** R2 con URLs firmadas de vida corta (patrón `messaging`
  upload-url → confirm), allowlist `image/jpeg|png|webp`, 5 MB máx, 5 fotos máx por
  donación. Nunca públicas: las ve el donante (con token) y usuarios autenticados.
  La subida pública requiere donación en `REGISTERED` + token de gestión válido.
- **Escrituras scopeadas:** recepción y edición de centro pasan por
  `TenantRepository.scoped()`; tests de aislamiento en `tests/tenant/`.
- **PII mínima y retención:** nombre + email; teléfono opcional (se agregó al
  diseñar la Fase 19, para que el centro pueda contactar cuando haga falta).
  `PENDING_EMAIL` > 7 días → purga (job ARQ, patrón de retención Fase 13).
  Borrado a solicitud del donante: manual en MVP (email), documentado en el aviso.
- **Control estructural (Fase 20):** el centro y la campaña que elige el donante
  son **intención, no destino** — no existe forma de designar consignatario ni de
  seguir los bienes hasta quién los recibió, y la tarima es mixta por diseño, así
  que no hay "lote de fulano" viajando junto. Son decisiones de dominio que
  cierran el esquema "yo dono, una parte relacionada recibe allá"; quien las
  cambie sin saberlo estará desarmando un control. Detalle en `docs/security.md`.
- **Legal:** actualizar aviso de privacidad (nueva categoría de titular: donante),
  tabla de retención y `CLAUDE.md` (reversión explícita del NO-objetivo #4).

## No entra (YAGNI)

- Cuenta con contraseña / panel del donante con historial.
- Edición del donante después de `RECEIVED`.
- Notificación de envío (queda como tarea opcional al final de la fase).
- SMS/WhatsApp, apps nativas, donaciones económicas (NO-objetivo #1 sigue intacto).

## Testing

- Ciclo de estados completo con eventos (unit, patrón `test_box_seal`).
- Tokens: single-use, expiración, rotación, hash-only.
- Anti-enumeración de `/d/{code}` y de la gestión.
- Aislamiento multi-tenant de recepción y listado (suite `tests/tenant/`).
- Conversión renglones → intake pre-llenado (incluye renglón de texto libre).
- Purga de `PENDING_EMAIL` y expiración de tokens de gestión.
