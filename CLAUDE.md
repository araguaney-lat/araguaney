# CLAUDE.md — Acopio (coordinación de centros de acopio → envío humanitario)

> Contexto para Claude Code. Define **qué** construimos y con **qué reglas**.
> El **cómo por fases** vive en `docs/roadmap/`.
> Stack base: este repo deriva del boilerplate `fastapi-nextjs-boilerplate`.

---

## REGLA #1 — Git: nunca push a main

**NUNCA hagas `git push` directamente a `main`, sin importar la situación.**

Todo cambio sigue este flujo sin excepción:

1. Crear rama desde `main`:
   ```
   git checkout main && git pull
   git checkout -b feat/mi-feature   # o fix/, refactor/, chore/, docs/
   ```
2. Hacer commits en la rama.
3. Esperar que el usuario pida explícitamente el push: `"haz push"` / `"push"`.
4. Solo entonces: `git push -u origin <rama>`.
5. El PR también requiere aprobación explícita: `"crea el PR"` / `"abre el PR"`.

**Comandos bloqueados sin aprobación explícita:**
- `git push` (en cualquier rama)
- `git push origin main` (absolutamente prohibido)
- `gh pr create`
- Cualquier operación destructiva de git (`reset --hard`, `branch -D`, etc.)

**REGLA — Nunca más de 1 PR abierto a la vez:**
- Antes de crear cualquier PR: `gh pr list --state open`
- Si ya hay un PR abierto: NO crees otro. Trabaja sobre esa rama.
- Valida que siga abierto antes de pushear: `gh pr view <num> --json state -q .state`

---

## REGLA #2 — Este repositorio es público: revisa el diff antes de pushear

**Después del push no hay vuelta atrás.** GitHub conserva los commits por SHA
aunque después edites, aplastes la rama o hagas force-push; solo Soporte de
GitHub los purga de verdad. La revisión va **antes**, no después.

Antes de `git push` y antes de `gh pr create`, lee el diff completo
(`git diff main..HEAD`) con ojos de lector externo, incluido uno adversario, y
confirma que no va nada de esto:

- Credenciales, tokens, hosts de infraestructura o URLs de base de datos.
- Correos de operación (incluido el del superadmin) y datos de cuentas de prueba.
- **Parámetros** de controles de seguridad o antifraude: umbrales, límites,
  ventanas. Publica el **mecanismo**, nunca el valor que determina cuándo salta;
  esos viven en variables de entorno.
- Texto que explique cómo evadir un control, aunque la intención sea documentar
  una limitación con honestidad. Descríbela como alcance del control, no como
  receta.
- Archivos colados por un `git add -A` sin mirar: capturas, artefactos, scratch.

Documentar un hueco conocido está bien y es sano. Publicar el paso a paso para
aprovecharlo, no. Las tipologías tipo banderas rojas sí se publican: FATF y los
bancos publican las suyas y el valor disuasorio supera al riesgo.

---

## 1. Resumen y problema

Tras el doble terremoto del 24 de junio de 2026 en el norte de Venezuela, decenas de
centros de acopio en México operan de forma independiente, cada uno con su propio
método. Eso impide (a) saber qué hay disponible a nivel nacional y (b) preparar carga
que cumpla el "régimen" de envío: **cajas homogéneas + manifiesto detallado**. Sin ese
orden, los envíos se atoran.

**Producto.** App web multi-centro donde cada centro registra donaciones en especie a
nivel de ítem, las empaca en **cajas homogéneas** con QR + etiqueta, las consolida en
**tarimas** y **envíos** con manifiesto exportable, y donde existe un **panel agregado
nacional** que suma el stock de todos los centros.

**Diferencial:** no es "otro inventario más", es el **estándar común + la agregación**.

---

## 2. Objetivos y NO-objetivos

**Objetivos**
1. Estandarizar el registro de donaciones en especie entre múltiples centros.
2. Garantizar la caja homogénea (un solo tipo de producto + lote + caducidad) con QR + etiqueta.
3. Consolidar cajas en tarimas y tarimas en envíos, con manifiesto/packing list exportable.
4. Dar visibilidad agregada nacional (stock por categoría / INN / concentración / centro).
5. Rechazar en intake lo que no cumple reglas de donación (caducidad, controlados).

**NO-objetivos (fuera de alcance del MVP)**
1. No gestiona dinero ni donativos económicos.
2. No gestiona beneficiarios finales. Solo inventario.
3. No gestiona rutas/transporte ni trámite aduanero end-to-end (solo produce el documento).
4. No es un CRM de donantes. La donación **anónima sigue siendo el default**, pero el
   donante puede identificarse: en ventanilla (Fase 19) o pre-registrando su donación
   en línea (Fase 18). Esos datos son de control interno del centro que los captura,
   nunca aparecen en una página pública, y el pre-registro sin confirmar se purga.
   El `donante_libre` de texto libre se conserva como legado.
5. No reemplaza a RITA/Sahana Eden; cuando aplique, interopera con sus formatos.

---

## 3. Stack y hosting

| Capa | Tecnología | Hosting |
|---|---|---|
| Front | Next.js (App Router) + NextAuth v5 | Vercel |
| Edge/seguridad | Cloudflare (DNS, WAF, DDoS, Turnstile, cache) | Free |
| Backend | FastAPI + SQLAlchemy 2 + slowapi | Railway |
| DB | PostgreSQL | Railway managed |
| Jobs/cache | ARQ + Redis (PDF en lote, exportes) | Railway |
| Generación | `qrcode[pil]` (QR) + ReportLab/WeasyPrint (PDF) | Backend |

---

## 4. Arquitectura multi-tenant (clave)

**Modelo "pool / row-level": un solo deploy, una sola DB, `center_id` discrimina por
centro.** No hay instancias ni bases por tenant. Es lo único que hace barata y trivial la
agregación nacional (un `GROUP BY`).

Regla de oro: **ningún endpoint consulta sin pasar por el scoping de tenant.**

```python
# app/dependencies.py
async def tenant_scope(user: User = Depends(current_user)) -> uuid.UUID | None:
    # national_admin -> None (ve todo); coordinator/volunteer -> su center_id
    return None if user.center_role == "national_admin" else user.center_id

# app/repositories/base.py  (TenantRepository extiende BaseRepository del boilerplate)
def scoped(self, stmt, center_id: uuid.UUID | None):
    return stmt if center_id is None else stmt.where(self.model.center_id == center_id)
```

**Separación lectura pública / escritura autenticada (anti-EDoS):**
- *Lectura pública cacheable en el edge*: ficha de QR (caja/tarima), panel "qué falta".
- *Escritura/operación autenticada*: intake, sellado, paletizado, manifiesto. Rate-limited.
- *Operaciones caras* (PDF, exportes): siempre autenticadas + rate-limited + encoladas en ARQ.

---

## 5. Secciones de la aplicación

| Sección | Para quién | Condición |
|---|---|---|
| `/dashboard` | volunteers, coordinators, national_admins | `users.role = user` (cualquier `center_role`) |
| `/studio` | superadmin de plataforma | `users.role = superadmin` |
| público | sin login | rutas `/`, `/qr/[code]`, `/necesidades`, `/donar`, `/d/[code]` |

> `users.role` del boilerplate (`user|admin|superadmin`) gobierna el acceso a secciones.
> `center_role` (`volunteer|coordinator|national_admin`) controla qué ve cada usuario dentro de `/dashboard`.

---

## 6. Roles y permisos

### Roles de dominio (`center_role`) — todos operan en `/dashboard`

| Rol | `center_id` | Puede |
|---|---|---|
| `volunteer` | su centro | Intake, crear/llenar/sellar cajas, imprimir etiquetas, ver sus propias solicitudes |
| `coordinator` | su centro | Todo lo del volunteer + crear/cerrar tarimas y envíos, generar manifiesto, agregar volunteers a su centro (con invitación), reiniciar contraseña de volunteers de su centro, gestionar miembros de campaña (solo de su centro) |
| `national_admin` | `NULL` | Ver agregado nacional, crear/editar centros y campañas, crear cualquier usuario (cualquier centro y rol), reiniciar contraseña de cualquier usuario de dominio, promover ProductTypes a global, ver auditoría, gestionar solicitudes |
| público (sin login) | — | Ver ficha mínima de caja/tarima por QR; panel "qué falta" |

El sidebar del `national_admin` en `/dashboard` tiene dos secciones:

```
[operativo]           [administración — solo national_admin]
  Inicio                Usuarios
  Campañas              Solicitudes
  Centros               Auditoría
  Transferencias
```

### Rol de plataforma (`superadmin`) — opera en `/studio`

| Puede |
|---|
| Crear y gestionar national_admins |
| Reiniciar contraseña de cualquier usuario (incluidos national_admins) |
| Ver auditoría general de la plataforma |
| Ver métricas de la aplicación (centros activos, cajas selladas, envíos) |
| Configuración del sistema (variables, flags) |
| Bloquear/desbloquear cualquier usuario |
| Monitoreo de anomalías (fase posterior) |

### Reglas de creación de usuarios

| Quién crea | Roles que puede asignar | `center_id` posible |
|---|---|---|
| `superadmin` | `national_admin` (y cualquier otro) | Cualquier centro o NULL |
| `national_admin` | `volunteer`, `coordinator` | Cualquier centro |
| `coordinator` | Solo `volunteer` | Solo su propio centro |

### Flujo de invitación / reset de contraseña

1. Admin crea usuario → sistema genera clave temporal → envía email de invitación
2. Usuario entra → sistema fuerza cambio de contraseña (`must_change_password = true`)
3. Desde perfil, el usuario puede cambiar contraseña en cualquier momento
4. Botón **"Reiniciar contraseña"** por fila en el user manager — genera nueva clave temporal, reenvía email; disponible según scope:
   - `superadmin`: cualquier usuario
   - `national_admin`: coordinators y volunteers (no otros national_admins)
   - `coordinator`: solo volunteers de su centro

> Todo usuario recién creado queda asignado automáticamente a la campaña "Donaciones Generales".

---

## 6. Modelo de dominio

```
Centro (tenant)
  Intake (recepción de donación)
    Box (caja HOMOGÉNEA, QR propio) ──► ProductType (SKU: categoría + atributos)
  Pallet (tarima, MIXTA, QR propio) ──► agrupa Boxes
  Shipment (envío) ──► agrupa Pallets ──► genera manifiesto
```

| Entidad | Esencia | Notas |
|---|---|---|
| `Center` | El tenant | |
| `User` (+`center_id`,`center_role`) | Operadores | national_admin con center_id NULL |
| `ProductType` | El SKU | Discriminado por atributos (p.ej. `strength`). Ibuprofeno 500mg ≠ 900mg |
| `Intake` | Recepción | Donante opcional (`donor_id`); `donante_libre` texto libre, legado |
| `Donor` | Donante identificado | `source`: `self` (se pre-registró) o `center` (lo capturó un centro) |
| `Donation` | Pre-registro en línea | `DN-` → QR. Se liga al `Intake` al recibirse |
| `Box` | Caja homogénea | 1 product_type + 1 batch + 1 expiry (garantizado por esquema). `code` → QR |
| `Pallet` | Tarima de transporte | Mixta; agrupa cajas selladas. `code` → QR |
| `Shipment` | Envío | Agrupa tarimas; genera manifiesto |
| `BoxEvent`/`PalletEvent`/`ShipmentEvent` | Auditoría | from_status → to_status + user + ts |

Categorías (`ProductType.category`): `MEDICINE | MEDICAL_SUPPLY | FOOD | WATER | HYGIENE | TOOL | RESCUE_GEAR | OTHER`.

---

## 7. Reglas de negocio

**Invariante de caja homogénea.** Una `Box` referencia exactamente un `product_type_id` y
tiene un solo `batch` y una sola `expiry_date`. Si llega mezcla → se divide en varias cajas.

**Validación de medicamentos** (WHO Guidelines for Medicine Donations, 3ª ed.):
1. Vida útil restante **≥ 365 días** a la fecha de captura → si no, `status = REJECTED`.
2. Campos obligatorios para sellar: `inn_name`, `batch`, `form`, `strength`, `expiry_date`.
3. `ProductType.is_controlled = true` → **bloqueado** en intake.

**Validación de alimentos:** vida útil mínima **≥ 180 días** (configurable por `min_shelf_life_days`).

**Máquinas de estado** (todo cambio escribe un `*_event`):
- `Box`: `DRAFT → SEALED → SHIPPED` (+ `REJECTED` desde `DRAFT`). Solo cajas `SEALED` entran a tarima.
- `Pallet`: `OPEN → CLOSED → SHIPPED`. Solo cajas `SEALED` entran; solo tarimas `CLOSED` entran a envío.
- `Shipment`: `OPEN → CLOSED → SHIPPED`. Al `SHIPPED` se congela todo.

---

## 8. Catálogos y datos de referencia

| Fuente | Uso | Costo |
|---|---|---|
| **UNSPSC** (UNDP) | Taxonomía de categorías; español | Gratis |
| **Catálogo IFRC/ICRC** | Specs + código de material de no-food | Gratis |
| **WHO Model List of Essential Medicines + ATC** | INN, clasificación medicamentos | Gratis |
| **Open Food Facts** | Autocompletado de alimentos por código de barras (API) | Gratis |
| **GS1 / Verified by GS1 (GTIN)** | Validar código de barras (campo opcional) | 30 lookups/día gratis |
| **COFEPRIS (MX)** | Identificación local de medicamentos/insumos | Gratis |
| **RxNorm (NLM / NIH)** | Normalización de nombres de medicamentos; mapeo INN → código RxNorm; API REST pública | Gratis |
| **IOM Emergency Relief Items Catalogue** | No-food items alineados a IFRC/ICRC; especificaciones técnicas + código de material | Gratis (web pública) |

> **Home pública:** debe incluir una sección visible "Estándares que respaldamos" con logos/nombres
> de WHO, IFRC/ICRC, IOM, UNSPSC y GS1, explicando cómo garantizan la calidad del inventario y
> la trazabilidad. Implementación en Fase 6 (task 12) junto al Home page (Fase 4, task 23).

---

## 9. Seguridad y protección DDoS/EDoS

1. Cloudflare delante de todo (plan Free): DDoS + WAF + rate limiting.
2. **Activar Cloudflare-only mode** en backend (`CLOUDFLARE_ONLY=true`). Requiere
   `CLOUDFLARE_SHARED_SECRET` + una Transform Rule en Cloudflare (ver `.env.example`)
   — el chequeo valida un header secreto, **no** el IP del TCP peer, porque en Railway
   ese peer es siempre el proxy interno de Railway, nunca el edge de Cloudflare.
3. Vercel WAF + rate limiting en el front.
4. **Turnstile** (gratis) en formularios públicos de escritura.
5. **Cache en el edge** de toda lectura pública (ficha QR, panel "qué falta").
6. **Spend caps** en Vercel + alertas de presupuesto.
7. Endpoints caros (PDF/export) detrás de auth + `slowapi` + cola ARQ.
8. Sin PII de beneficiarios → menor superficie LFPDPPP. La del donante es opcional,
   vive con plazo de conservación declarado y se purga sola si nunca se confirma.

---

## 10. Convenciones de código

### Capas del backend

```
routers/    → thin HTTP handlers (validate input, call service, return response)
services/   → business logic (extend BaseService, inject db via constructor)
repositories/ → data access only (extend TenantRepository + scoped(), no business logic)
schemas/    → Pydantic I/O models (extend StrictModel or StrictORMModel from schemas/_base.py)
```

- Nunca `db.query()` en un router — usa un repository method.
- Nunca lógica de negocio en un router — delega al service.
- Services son framework-agnostic: sin `Request`, `Response`, o `Depends` dentro.
- Multi-tenant: **todo** acceso a datos pasa por `TenantRepository.scoped(...)`.

### Modelos

- Estilo `Column(...)` clásico como `models/user.py`.
- PK `UUID(as_uuid=True)` con `default=uuid.uuid4` (no server_default).
- Timestamps `DateTime(timezone=True)`.
- Estados como `String` + CHECK constraint (no ENUM nativo de Postgres).

### Migraciones

- Alembic encadenado: `002` → `001_add_login_lockout`.
- Toda nueva migración: `alembic revision --autogenerate -m "desc"` + `alembic upgrade head`.
- Importar nuevo modelo en `alembic/env.py`.

### API

- Todas las rutas bajo `/v1` (`_V1 = "/v1"` en `main.py`).
- Errores con envelope: `raise api_error("CODE", "message", field="field")`.
- Rate limiting `@limiter.limit()` en todo endpoint público/auth.
- IP siempre via `get_client_ip(request)` de `utils/cloudflare.py`.

### Background jobs y cache

- Nunca trabajo lento inline → `enqueue(background_tasks, "task_name", *args)`.
- Cache: `app.utils.cache` (no-op sin Redis; tratar miss como "carga de DB").
- PDF/export: siempre encolado en ARQ.

### Seguridad del código

- Columnas sensibles en DB: `encrypt_value` / `decrypt_value` de `app.utils.crypto`.
- URLs de usuario: validar con `validate_url()` de `app.utils.url_security` (SSRF).
- Inputs: `app.utils.sanitize` helpers en validators de Pydantic.

### Frontend

- Mutaciones en `src/lib/actions.ts` con `"use server"`.
- API calls via `apiFetch` de `src/lib/api.ts`.
- Auth: `auth()` en Server Components, `useSession` en Client Components.
- `apiFetch` centralizado — sin `fetch` crudo en componentes.
- i18n: español por default.

### Errores al cliente

- Mensajes genéricos al cliente (sin stack traces).
- Alertas a Slack en errores 500 (heredado del boilerplate).

---

## 11. Flujo para agregar una feature

1. Modelo en `backend/app/models/` + importar en `alembic/env.py`
2. `alembic revision --autogenerate -m "desc"` + `alembic upgrade head`
3. Repository en `backend/app/repositories/` extendiendo `TenantRepository`
4. Service en `backend/app/services/` extendiendo `BaseService`
5. Schemas en `backend/app/schemas/` extendiendo `StrictModel` / `StrictORMModel`
6. Router en `backend/app/routers/` + registrar en `main.py` con `prefix=_V1`
7. Server action en `frontend/src/lib/actions.ts`
8. Página/componente en `frontend/src/app/`
9. Actualizar `docs/roadmap/phase-NN-*.md` + totales en `docs/roadmap/README.md`

---

## 12. Métricas de éxito

1. Nº de centros activos.
2. Nº de cajas selladas/etiquetadas.
3. Nº de envíos con manifiesto.
4. % de donaciones `REJECTED` en intake.
5. Tiempo medio de captura por caja.

---

## 13. Definition of Done (por tarea)

- Regla de negocio cubierta por test (pytest en backend).
- Acceso a datos pasa por scoping de tenant (sin fuga entre centros).
- Endpoint público nuevo: cacheable o explícitamente rate-limited.
- Cambio de estado escribe su `*_event`.
- Migración Alembic reversible (`upgrade`/`downgrade`).
- Sin PII de beneficiario introducida. La del donante solo por las vías previstas
  (pre-registro o captura en ventanilla), nunca en superficie pública.

---

## 14. Capas opcionales del boilerplate

Disponibles (desactivadas por default): Cloudinary, AI/OpenAI, Langfuse, Stripe, 2FA/TOTP, GeoIP/MaxMind.
Ver `docs/optional-layers.md` para activar.
