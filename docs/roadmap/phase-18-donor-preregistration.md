# Fase 18 — Pre-registro de donaciones por el donante

> El donante registra su donación desde casa (renglones + fotos), confirma su email y
> obtiene un QR. El centro lo escanea al recibirla y el doble check reemplaza a la
> captura desde cero: el registro se convierte en el intake pre-llenado. Registro
> ligero sin contraseña (nombre + email verificado, gestión por enlace firmado).
>
> **Spec:** `docs/superpowers/specs/2026-07-29-donor-preregistration-design.md`
> **Infra:** $0 nuevo (reusa Turnstile, Resend, R2, QR, ARQ, doble opt-in de Fase 14).
> **Campañas:** el donante puede elegir campaña de las públicas (`campaigns.is_public`,
> gestionable desde el gestor); la asociación vinculante la hace el intake al recibir.
> **Legal:** esta fase introduce PII de donantes y revierte el NO-objetivo #4 del
> `CLAUDE.md`; la task 20 lo deja documentado.

---

## Objetivos

1. Que el centro no inventaríe desde cero lo que ya viene registrado: escanear →
   doble check → intake pre-llenado.
2. Darle al centro señal de volumen entrante (donaciones dirigidas a él, aún no
   entregadas).
3. Cerrar el ciclo con el donante: confirmación, recepción y (opcional) envío, por email.
4. Todo lo público endurecido: Turnstile, rate limiting, tokens hasheados,
   anti-enumeración, PII mínima con purga.

## No-objetivos (MVP)

- Cuenta con contraseña o panel del donante (el registro ligero es la semilla).
- Edición del donante después de `RECEIVED`.
- SMS/WhatsApp; donaciones económicas (NO-objetivo #1 intacto).

---

## Tareas

### Backend — modelo y dominio

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Modelos + migración `031` | `Donor`, `Donation` (incluye `intended_campaign_id` nullable), `DonationItem`, `DonationPhoto`, `DonationEvent` según spec. CHECKs de estado, `donation_items` con "exactamente uno de `product_type_id`/`free_text`". Añade `campaigns.is_public` (default `false`, backfill `true` donde hay `slug`). Importar en `alembic/env.py` y `app/models/__init__.py`. Reversible. | 🔴 Alta | ✅ Done |
| 2 | `DonorRepository` + `DonationRepository` | CRUD + búsqueda por hash de token, por `code`, listado scoped por centro (`TenantRepository.scoped()` sobre `received_center_id` / `intended_center_id`). | 🟠 Media | ✅ Done |
| 3 | `DonationService`: alta + doble opt-in | `submit` (dedupe por email+donación abierta, token verificación hasheado single-use, email), `confirm_email` (→ `REGISTERED`, genera token de gestión + email con QR), `resend` (rotación de token, Turnstile). Patrón `CenterApplicationService`. | 🔴 Alta | ✅ Done |
| 4 | `DonationService`: gestión del donante | Autenticación por token de gestión (hash + expiración 30 d + rotación), editar/añadir/quitar renglones y fotos solo en `REGISTERED`, `cancel`. Cada transición escribe `DonationEvent`. | 🟠 Media | ✅ Done |
| 5 | `DonationService`: recepción | `receive` (doble check por renglón, renglones extra `added_by=center`, `received_center_id` por `tenant_scope`, → `RECEIVED` + evento) y armado del **borrador de intake** a partir de renglones con `product_type_id`; liga `donation.intake_id` al intake creado. | 🔴 Alta | ✅ Done |
| 6 | Routers públicos `/v1/donations/public/*` | Alta, confirmación, reenvío, ficha `/d/{code}` (mínima, sin PII, cacheable), gestión por token. Turnstile + `@limiter.limit()` en todos; 404 genérico anti-enumeración. | 🟠 Media | ✅ Done |
| 7 | Router autenticado `/v1/donations/*` | Listado scoped (dirigidas a mi centro / recibidas por mi centro; `national_admin` ve todo), detalle por `code`, `receive`. | 🟠 Media | ✅ Done |
| 8 | Fotos en R2 | upload-url → confirm (patrón `messaging`), allowlist JPEG/PNG/WebP, 5 MB, máx 5 por donación. Subida pública exige `REGISTERED` + token de gestión; lectura con URL firmada corta. | 🟠 Media | ⬜ |
| 9 | QR `DN-` | `donation_qr_png` en `app/utils/qr.py` → `/d/{code}`. | 🟢 Baja | ✅ Done |
| 9b | Campañas públicas | `GET /v1/campaigns/public` (solo `is_active AND is_public`, sin auth, rate-limited, cacheable). Toggle "mostrar en la página pública" en el gestor de campañas (crear + editar). Índice público `/eventos` que lista esas campañas y enlaza las fichas `/eventos/[slug]` existentes (i18n ES/EN); `[slug]` responde 404 para campañas no públicas. | 🟠 Media | ✅ Done |
| 10 | Emails (3 plantillas) | Confirmación de email, QR + enlace de gestión, resumen de recepción. Marca de Fase 16; envío via ARQ. | 🟠 Media | ✅ Done |
| 11 | Purga y expiración | Job ARQ: `PENDING_EMAIL` > 7 días → `EXPIRED` + purga de PII del donante sin otras donaciones; tokens de gestión vencidos. Documentar en la tabla de retención. | 🟠 Media | ⬜ |

### Frontend — donante (público)

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 12 | `/donar` | Formulario: datos, selector de centros activos, campaña opcional (de `/v1/campaigns/public`; sin elegir → Donaciones Generales), renglones con autocompletado de catálogo + texto libre, fotos, Turnstile. i18n ES/EN. | 🔴 Alta | ✅ Done |
| 13 | Confirmación + gestión | Página de "revisa tu correo", `/donacion/[token]` (editar renglones/fotos/cancelar en `REGISTERED`; solo lectura después), reenvío de enlace. | 🟠 Media | ✅ Done |
| 14 | Ficha pública `/d/[code]` | Estado + resumen de renglones, sin PII, cacheable. Estilo de `/b/[code]`. | 🟢 Baja | ✅ Done |

### Frontend — centro (dashboard)

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 15 | Escáner reconoce `DN-`/`/d/` | `/dashboard/scan` y `parseBoxCode` de tarimas enrutan al detalle de donación. | 🟢 Baja | ✅ Done |
| 16 | Vista de recepción | `/dashboard/donations/[code]`: renglones, fotos, doble check, renglones extra, confirmar → redirige al intake pre-llenado con la campaña sugerida pre-seleccionada (los renglones de texto libre se mapean ahí; el intake es la asociación vinculante a campaña). | 🔴 Alta | ✅ Done |
| 17 | Listado de donaciones | `/dashboard/donations`: entrantes (dirigidas a mi centro) y recibidas. Entrada en el sidebar. | 🟠 Media | ✅ Done |

### Transversal

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 18 | Tests | Ciclo de estados + eventos, tokens (single-use, expiración, rotación, hash-only), anti-enumeración, aislamiento tenant en `tests/tenant/`, conversión renglones → intake, purga. | 🔴 Alta | ⬜ |
| 19 | Seguridad de cierre | Pasada final: rate limits en todos los endpoints nuevos, cache headers de la ficha, revisión con `security-reviewer`. | 🟠 Media | ⬜ |
| 20 | Legal | Aviso de privacidad (nueva categoría: donante), tabla de retención, `CLAUDE.md` (reversión explícita del NO-objetivo #4 y nueva sección pública `/donar`). | 🟠 Media | ⬜ |
| 21 | (Opcional) Email "salió en envío" | Propagar `SHIPPED` de las cajas del intake ligado → email al donante. Solo si el MVP aterriza bien. | 🟠 Media | ⬜ |

---

## Orden sugerido

1 → 2 → 3 → 6 (alta pública completa) → 9 → 9b → 10 (QR + campañas públicas +
emails) → 4 → 13 (gestión) → 12 → 14 (frontend público) → 5 → 7 → 15 → 16 → 17
(recepción) → 8 (fotos) → 11 → 18 → 19 → 20 (cierre). La 21 queda fuera del corte.

## Definition of Done de la fase

- Un donante puede registrar, confirmar email, recibir su QR, editar y cancelar sin
  hablar con nadie.
- Un centro escanea el QR y confirma la recepción en menos pasos de los que le
  tomaría capturar desde cero; el intake queda ligado a la donación.
- Ningún endpoint público sin Turnstile o rate limit; ningún token en claro en DB.
- La ficha pública no expone PII y responde igual ante códigos inexistentes.
- Tests de aislamiento entre centros en verde.
- Aviso de privacidad y `CLAUDE.md` actualizados.
