### Fase 6 — Catálogos de referencia + lookups en tiempo real ⬜

---

#### Principios de diseño

**Conectividad:**
Usar un producto existente en catálogo → funciona sin internet.
Registrar un ProductType nuevo → requiere internet para validar contra fuentes externas.
Si no hay conexión, el sistema lo dice claramente y bloquea la creación; no hay modo degradado silencioso porque los errores tipográficos y los duplicados envenenan los datos de todos los centros.

**Scope de ProductType — dos niveles:**

| `campaign_id` | Visible para |
|---|---|
| `NULL` | Todos los centros, todas las campañas (seeds globales + productos promovidos por admin) |
| `UUID campaña X` | Todos los centros que trabajen en campaña X |

No existe un scope "privado al centro" — la unidad operativa es la campaña, no el centro.
Si un producto nuevo llega en el contexto de la Operación Venezuela, lo pueden usar todos los centros de esa campaña sin contaminación del catálogo global.

**Campaña obligatoria en intake:**
Todo `Intake` debe tener `campaign_id`. Siempre existe una campaña **"Donaciones Generales"** abierta para recibir donaciones que no corresponden a una operación específica. Esto evita el problema de recepciones sin contexto y mantiene el agregado nacional coherente.

**Usuarios ↔ Campañas (many-to-many):**
Un usuario puede pertenecer a una o varias campañas activas. Esta asociación determina qué productos ve y en qué contexto opera.

| Rol | Puede asignar usuarios a campañas |
|---|---|
| `national_admin` | Cualquier usuario a cualquier campaña |
| `coordinator` | Solo usuarios de su propio centro |
| `volunteer` | No puede asignar |

Reglas de visibilidad derivadas de la asignación:
- El usuario solo ve ProductTypes globales (`campaign_id IS NULL`) + los de sus campañas asignadas
- El autocomplete de intake filtra por las campañas del usuario
- Si el usuario tiene **una sola** campaña activa → se preselecciona automáticamente en el intake, sin selector
- Si tiene **varias** campañas activas → selector obligatorio al iniciar el intake
- La campaña "Donaciones Generales" se asigna automáticamente a todos los usuarios al crearlos (nunca queda huérfano)

**Flujo de un ProductType nuevo:**
1. Coordinador inicia intake en Campaña X (autoseleccionada o elegida)
2. El producto no aparece en el autocomplete (no está en global ni en Campaña X)
3. Sistema pide conexión — sin internet, bloquea la creación
4. Con internet: lookup vía barcode (Open Food Facts) o INN (RxNorm)
5. Nuevo producto se crea con `campaign_id = X` — visible para todos los asignados a esa campaña
6. national_admin puede promover a global (`campaign_id → NULL`)

---

#### Prerrequisitos de datos (acción manual única, sin costo)

| Fuente | Qué obtener | Para qué |
|--------|------------|---------|
| WHO Model List of Essential Medicines | ~500 medicamentos INN + ATC + forma + concentración | Seed global de medicamentos |
| IOM Emergency Relief Items Catalogue | ~300 no-food items con specs y código de material | Seed global de no-food |
| IFRC/ICRC Catalogue | Artículos complementarios de kits | Complemento seed IOM |

> No se requieren cuentas ni API keys — son CSVs públicos descargados una vez.

---

#### Auditoría — Eventos de Fase 6

Todos vía `fire_audit(background_tasks, ...)` en los routers:

| Evento | Cuándo | Metadata |
|---|---|---|
| `PRODUCT_TYPE_CREATED` | Nuevo ProductType creado | `{campaign_id, inn_name, form, strength, created_by_role}` |
| `PRODUCT_TYPE_PROMOTED` | `campaign_id → NULL` (promovido a global) | `{from_campaign_id, promoted_by}` |
| `USER_CAMPAIGN_ASSIGNED` | Usuario asignado a campaña | `{user_id, campaign_id, assigned_by_role}` |
| `USER_CAMPAIGN_REMOVED` | Usuario removido de campaña | `{user_id, campaign_id}` |
| `INTAKE_CREATED` | Ya existe — se amplía la metadata con `campaign_id` | `{campaign_id, center_id}` |

---

#### Backend — Migraciones arquitecturales

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | `012_user_campaigns` | Tabla `user_campaigns(user_id FK, campaign_id FK, assigned_by FK, assigned_at)`; PK compuesta `(user_id, campaign_id)`; índices en ambas FK; la campaña "Donaciones Generales" se asigna automáticamente al crear un usuario (trigger en service, no en DB) | 🟠 | ✅ Hecho |
| 2 | `013_intake_campaign_required` | Agregar `campaign_id UUID NOT NULL FK → campaigns(id)` a `intakes`; la migración primero crea la campaña "Donaciones Generales" (si no existe) y asigna ese `campaign_id` a todos los intakes históricos antes de poner el `NOT NULL`; índice en `(campaign_id)` | 🟠 | ✅ Hecho |
| 3 | `014_product_type_scope` | Agregar `campaign_id UUID NULLABLE FK → campaigns(id)` a `product_types`; `NULL` = global; índice en `(campaign_id)` | 🟡 | ✅ Hecho |
| 4 | `UserCampaignRepository` | `assign(user_id, campaign_id, assigned_by)`, `list_by_user(user_id)`, `list_by_campaign(campaign_id)`, `remove(user_id, campaign_id)`; guard: coordinator solo puede asignar usuarios de su propio `center_id` | 🟡 | ✅ Hecho |
| 5 | Actualizar `ProductTypeRepository` | `list(user_id)` resuelve las campañas del usuario y retorna globales + los de esas campañas; guard de dedup `(inn_name, form, strength)` con `unaccent + lower` dentro del scope visible; `create()` exige `campaign_id` salvo `national_admin` | 🟠 | ✅ Hecho |
| 6 | Endpoint de promoción (admin) | `POST /v1/studio/product-types/{id}/promote` — `national_admin` mueve `campaign_id → NULL`; log en auditoría | 🟡 | ✅ Hecho |
| 7 | Endpoints de asignación de campañas | `POST /v1/campaigns/{id}/members` y `DELETE /v1/campaigns/{id}/members/{user_id}` — coordinator (solo su centro) y national_admin; `GET /v1/campaigns/{id}/members` — lista de asignados | 🟡 | ✅ Hecho |
| 8 | Actualizar `IntakeService` y schemas | `IntakeCreate` incluye `campaign_id` requerido; validar que campaña está activa y el usuario tiene acceso a ella; `IntakeOut` expone `campaign_id` | 🟡 | ✅ Hecho |

---

#### Backend — Seeds (carga única en migración)

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 6 | Seed campaña "Donaciones Generales" | Incluida en migración `012`; `is_active=true`, `destination_country=NULL`; sirve como campaña fallback permanente; no se puede desactivar desde el UI (guard en service) | 🟢 | ✅ Hecho |
| 7 | Seed WHO Essential Medicines | Migración `014_seed_who_medicines` idempotente: ~500 medicamentos con `inn_name`, `form`, `strength`, `category=MEDICINE`, `is_controlled`, `min_shelf_life_days=365`, `campaign_id=NULL` | 🟠 | ⬜ Pendiente |
| 8 | Seed IOM/IFRC no-food items | Migración `015_seed_iom_nonfood`: ~300 artículos; `campaign_id=NULL` | 🟠 | ⬜ Pendiente |
| 9 | Seed alimentos frecuentes | Migración `016_seed_common_food`: ~50 alimentos básicos; `category=FOOD`, `min_shelf_life_days=180`, `campaign_id=NULL` | 🟡 | ⬜ Pendiente |

> Seeds idempotentes: `INSERT ... ON CONFLICT (inn_name, form, strength) WHERE campaign_id IS NULL DO NOTHING`.

---

#### Backend — APIs de lookup (requeridas solo al crear nuevo ProductType)

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 10 | Búsqueda en catálogo local | `GET /v1/catalog/search?q=&campaign_id=` → retorna globales + los de la campaña; sin internet requerido; base del autocomplete en intake | 🟢 | ✅ Listo |
| 11 | Barcode lookup vía Open Food Facts | `GET /v1/catalog/barcode/{gtin}` → Open Food Facts API; caché Redis 24 h; `503` claro si sin internet | 🟡 | ✅ Listo |
| 12 | INN autocomplete vía RxNorm | `GET /v1/catalog/rxnorm?q=` → NLM RxNorm REST API; `503` si sin internet; rate-limit 60/min (API pública sin key) | 🟡 | ✅ Listo |
| 13 | Validación GTIN | Dígito de control EAN-8/13/UPC-A en backend sin API key; lookup GS1 como enriquecimiento opcional | 🟢 | ✅ Listo |

---

#### Frontend — Flujo de intake y nuevo ProductType

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 14 | Selector de campaña en intake | Campo requerido al crear intake; muestra campañas activas; "Donaciones Generales" siempre aparece primero; el selector persiste como contexto para el autocomplete de productos | 🟡 | ✅ Listo |
| 15 | Autocomplete en intake (catálogo local) | Campo tipo-ahead que consulta `/v1/catalog/search?campaign_id=X`; offline-OK; seleccionar prellenea INN, forma, concentración, categoría | 🟠 | ✅ Listo |
| 16 | Indicador de conectividad + bloqueo | Banner en formulario de nuevo ProductType: "● Con conexión — lookups activos" / "● Sin conexión — solo puedes usar productos del catálogo existente"; botón de crear deshabilitado sin conexión | 🟡 | ✅ Listo |
| 17 | Barcode → prellenado + bloqueo offline | Al escanear/ingresar GTIN: llama `/v1/catalog/barcode/{gtin}`; prellenado si hay match; `503` → "Sin conexión — no se puede registrar el producto"; no permite continuar | 🟡 | ✅ Listo |
| 18 | INN autocomplete con RxNorm | Campo `inn_name` con sugerencias de `/v1/catalog/rxnorm?q=`; `503` → aviso visible; guard de dedup sigue activo | 🟡 | ✅ Listo |
| 19 | Vista "Catálogo de la campaña" en Studio | `/studio/catalog` — lista ProductTypes de cada campaña con estado (campaña / global); botón "Promover al catálogo global" para national_admin | 🟡 | ✅ Listo |
| 20 | Gestión de miembros de campaña en Studio | `/dashboard/campaigns/{id}/members` — lista de usuarios asignados; botón para agregar (selector de usuarios del centro para coordinador, cualquier usuario para admin); botón para remover | 🟡 | ✅ Listo |
| 21 | Auto-asignación a "Donaciones Generales" | Al crear un usuario desde `/studio/users`, el sistema lo asigna automáticamente a la campaña "Donaciones Generales"; visible en la vista de miembros | 🟢 | ✅ Listo |

---

#### Peso — Modelo y métricas

> El peso es crítico para logística (carga máxima de camiones y aviones, metas de tonelaje). Se captura en el ProductType y fluye hacia arriba automáticamente.

**Dónde vive el peso:**

| Campo | Tabla | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `unit_weight_kg` | `product_types` | `Decimal(8,3) NULLABLE` | No | Peso por unidad; viene del seed/barcode lookup o lo llena el coordinador |
| `weight_kg` | `boxes` | `Decimal(8,3) NULLABLE` | No | Auto: `unit_weight_kg × quantity`; si no hay en ProductType, entrada manual opcional |
| `tare_weight_kg` | `pallets` | `Decimal(8,3) NULLABLE` | No | Peso vacío de la tarima; para peso bruto real |
| `weight_goal_kg` | `campaigns` | `Decimal(10,3) NULLABLE` | No | Meta de tonelaje de la campaña; si NULL → no se muestra barra de progreso |

**Regla de visualización de progreso:**
- `Campaign.weight_goal_kg IS NULL` → mostrar solo "X kg acopiados" (sin barra)
- `Campaign.weight_goal_kg IS NOT NULL` → mostrar barra de progreso "X kg / Y kg (Z%)"

**Visibilidad por rol:**

| Quién ve | Qué ve |
|---|---|
| Todos los usuarios autenticados | Métricas de su centro: "Tu centro: X kg acopiados" (número simple, sin meta) |
| Todos los usuarios autenticados | Métricas de cada campaña en la que participan: total kg + barra si hay meta |
| `national_admin` | Panel nacional: suma de todas las campañas + barra por campaña si tiene meta |

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 22 | Migración campos de peso | `unit_weight_kg` en `product_types`; `weight_kg` en `boxes`; `tare_weight_kg` en `pallets`; `weight_goal_kg` en `campaigns` — todos `NULLABLE` | 🟡 | ✅ Hecho |
| 23 | Auto-cálculo de `weight_kg` en Box | En `BoxService.seal()`: si `product_type.unit_weight_kg` existe → calcular y guardar `weight_kg`; si no → dejar NULL (coordinador puede editar antes de sellar) | 🟡 | ✅ Hecho |
| 24 | Endpoint de métricas de peso | `GET /v1/dashboard/weight?campaign_id=&center_id=` — retorna `{total_kg, goal_kg, progress_pct}` por campaña y `{center_kg}` por centro; `national_admin` puede omitir filtros para ver todo | 🟡 | ✅ Hecho |
| 25 | Componente de progreso en dashboard | Tarjeta por campaña: muestra kg acopiados; si hay `weight_goal_kg` → barra de progreso con porcentaje; si no → solo el número. Visible para todos los roles | 🟡 | ✅ Hecho |
| 26 | Métrica de centro (número simple) | En el dashboard de cada usuario: "Tu centro ha acopiado X kg" — un solo número, sin meta, sin barra | 🟢 | ✅ Hecho |

---

#### Ficha QR enriquecida (mobile-first)

> Al escanear el QR de una caja o tarima, la pantalla pública muestra toda la información relevante. Diseño mobile-first: se usa principalmente desde celulares en el almacén o en tránsito.

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 27 | Endpoint de ficha enriquecida | `GET /v1/public/qr/{code}` — retorna datos completos de caja o tarima según el `code`; cacheable en el edge (Cloudflare); sin login | 🟡 | ✅ Listo |
| 28 | Página QR mobile-first `/qr/[code]` | Layout vertical optimizado para celular; para **caja**: nombre del producto, categoría, INN/forma/concentración, lote, caducidad, cantidad, peso, status (badge), centro de origen, campaña, historial de eventos (timeline); para **tarima**: lista de productos con cantidades y peso total, status, número de cajas; tipografía grande, contraste alto | 🟠 | ✅ Listo |
| 29 | Estado visual del historial | Timeline al pie de la ficha QR: "Creada", "Sellada", "Transferida desde [Centro X]" (si aplica), "En envío", etc.; fechas en formato local | 🟡 | ✅ Listo |

---

#### Línea de tiempo de estado (componente transversal)

> Un componente reutilizable `<StatusTimeline>` que muestra en qué etapa está cualquier entidad (caja, tarima, envío, transferencia). Minimalista: ícono de estado + etiqueta + timestamp cuando ya ocurrió. Vertical en móvil, horizontal en escritorio.

**Etapas por entidad:**

| Entidad | Etapas en orden |
|---|---|
| Caja | Recibida · En preparación · Sellada · En tarima · En envío · Despachada |
| Caja transferida | …Sellada · **Transferida** · En tarima · En envío · Despachada |
| Caja rechazada | Recibida · En preparación · **Rechazada** (rojo, fin) |
| Tarima | Abierta · Cerrada · Despachada |
| Envío | Abierto · Cerrado · Despachado |
| Transferencia | Solicitada · Aprobada · En tránsito · Recibida |
| Transferencia rechazada | Solicitada · **Rechazada** (rojo, fin) |

**Estados visuales de cada paso:**
- `done` — círculo relleno + checkmark + timestamp en gris
- `current` — círculo con anillo resaltado (color primario) + etiqueta en negrita
- `pending` — círculo vacío + etiqueta en gris claro
- `error` — círculo rojo + etiqueta en rojo (RECHAZADA)

**Dónde se usa:**
- Ficha QR de caja (mobile-first, pública)
- Ficha QR de tarima (mobile-first, pública)
- Vista de detalle de caja en dashboard
- Vista de detalle de tarima en dashboard
- Vista de detalle de envío en dashboard
- Vista de detalle de transferencia en dashboard y Studio

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 32 | Componente `StatusTimeline` | `src/components/StatusTimeline.tsx`; props: `steps: TimelineStep[]`; responsive (vertical móvil, horizontal escritorio); sin dependencias externas, solo Tailwind | 🟡 | ✅ Listo |
| 33 | Integrar en ficha QR pública | En `/qr/[code]`: timeline al centro de la pantalla para caja y tarima; timestamps en formato `DD MMM, HH:mm` | 🟡 | ✅ Listo |
| 34 | Integrar en vistas de detalle del dashboard | En vistas de detalle de caja, tarima, envío y transferencia; mismo componente, datos desde el endpoint de detalle | 🟡 | ✅ Listo |

---

#### Interoperabilidad y home page

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 30 | Export IFRC packing list (Excel) | Manifiesto en `.xlsx` con columnas IFRC: código de material, descripción, unidad, cantidad, peso | 🟡 | ✅ Listo |
| 31 | Sección "Estándares que respaldamos" | Bloque en home pública: logos/nombres de WHO, IFRC/ICRC, IOM, UNSPSC; texto breve de trazabilidad | 🟢 | ✅ Listo |

---

> **Decisiones de diseño:**
> - `product_types.campaign_id IS NULL` = catálogo global (seeds + promovidos). `campaign_id = X` = scoped a campaña X, visible para todos los centros de esa campaña.
> - `intakes.campaign_id NOT NULL` — toda recepción tiene contexto operacional. La campaña "Donaciones Generales" garantiza que siempre hay un fallback sin forzar una operación específica.
> - La deduplicación usa `unaccent(lower(...))` de PostgreSQL: "ibuprofén" = "ibuprofen" = "Ibuprofeno" dentro del mismo scope visible.
> - Promover no copia — solo mueve `campaign_id → NULL`. Si dos campañas crearon el mismo producto, el admin elige el canónico; el otro queda scoped a su campaña.
> - `weight_goal_kg IS NULL` = sin meta = sin barra de progreso; nunca se muestra una barra vacía o en 0%.
> - El peso se captura donde más información existe (ProductType/seed) y fluye hacia abajo; solo se pide manualmente cuando no hay referencia.
> - COFEPRIS y RITA/Sahana export: diferidos a iteración posterior.
