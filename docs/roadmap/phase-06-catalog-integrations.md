### Fase 6 — Catálogos de referencia + lookups en tiempo real ⬜

> **Principio de diseño:** _Usar un producto existente en catálogo → funciona sin internet. Registrar un ProductType nuevo → requiere internet para validar contra fuentes externas._
>
> Los seeds cubren ~95 % de los artículos humanitarios comunes (medicamentos esenciales WHO, no-food IFRC/IOM, higiene, alimentos frecuentes).
> Las APIs en tiempo real enriquecen el registro de productos nuevos y garantizan datos limpios — nunca son un "plus silencioso": si no hay conexión, el sistema lo dice claramente y bloquea la creación de duplicados/mal escritos.
>
> **¿Por qué requerir internet en vez de modo offline-graceful?**
> Un almacén sin cobertura puede operar registrando intakes con productos ya en catálogo.
> Habilitar el registro offline de ProductTypes nuevos produciría duplicados e inconsistencias (ibuprofen / ibuprofeno / Ibuprofén / iboprofeno).
> La restricción es deliberada: calidad de datos > conveniencia de captura.

---

#### Prerrequisitos de datos (acción manual única, sin costo)

| Fuente | Qué obtener | Para qué |
|--------|------------|---------|
| WHO Model List of Essential Medicines (PDF/CSV) | ~500 medicamentos INN + ATC + forma + concentración | Seed de `product_types` para medicamentos |
| IOM Emergency Relief Items Catalogue | ~300 no-food items con specs y código de material | Seed de `product_types` para no-food |
| IFRC/ICRC Catalogue | Artículos complementarios de kits | Complemento al seed IOM |
| UNSPSC codeset | Segmentos: 51 (Drugs), 53 (Food), 46 (Defense/Safety), 42 (Medical) | Mapeo de categorías del sistema a UNSPSC |

> No se requieren cuentas ni API keys para los seeds — son CSVs públicos descargados una vez.

---

#### Backend — Seeds (carga única en migración)

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Seed WHO Essential Medicines | Migración Alembic idempotente (`009_seed_who_medicines`) que importa ~500 medicamentos del WHO Model List: `inn_name`, `form`, `strength`, `category=MEDICINE`, `is_controlled` según lista de psicotrópicos; `min_shelf_life_days=365` | 🟠 | ⬜ Pendiente |
| 2 | Seed IOM/IFRC no-food items | Migración `010_seed_iom_nonfood` con ~300 artículos: mantas, lonas, kits de higiene, herramientas de rescate; `category` mapeada a las 8 categorías del sistema; código de material IFRC en metadata | 🟠 | ⬜ Pendiente |
| 3 | Seed alimentos frecuentes | Migración `011_seed_common_food` con ~50 alimentos de primera necesidad (arroz, frijol, aceite, leche en polvo, agua embotellada); `category=FOOD`, `min_shelf_life_days=180` | 🟡 | ⬜ Pendiente |

> Los seeds son idempotentes: usan `INSERT ... ON CONFLICT (inn_name, form, strength) DO NOTHING`.
> Viven en la DB desde el primer deploy — sin internet requerido para operación normal de intakes.

---

#### Backend — APIs de lookup (requeridas solo al crear nuevo ProductType)

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 4 | Endpoint de búsqueda en catálogo | `GET /v1/catalog/search?q=&category=` → busca en `product_types` existentes (DB local); retorna sugerencias ordenadas por relevancia para el autocomplete | 🟢 | ⬜ Pendiente |
| 5 | Barcode lookup vía Open Food Facts | `GET /v1/catalog/barcode/{gtin}` → consulta Open Food Facts API; cacheable en Redis 24 h; si sin internet, retorna `503` con mensaje claro; nunca fallback silencioso | 🟡 | ⬜ Pendiente |
| 6 | INN autocomplete vía RxNorm | `GET /v1/catalog/rxnorm?q=` → consulta NLM RxNorm REST API; sugiere INN normalizado + código RxNorm; si sin internet, retorna `503`; rate-limit: 60/min (API pública sin key) | 🟡 | ⬜ Pendiente |
| 7 | Guard de deduplicación | Al `POST /v1/product-types`: verificar si ya existe un `ProductType` con mismos `inn_name + form + strength` (insensible a mayúsculas/tildes vía `ILIKE` + `unaccent`); retornar `409 DUPLICATE` con el ID del existente | 🟡 | ⬜ Pendiente |
| 8 | Validación GTIN (GS1) | Campo `gtin` en ProductType validado contra patrón EAN-8/EAN-13/UPC-A; verificación de dígito de control en backend (sin API key); lookup GS1 online opcional | 🟢 | ⬜ Pendiente |

> **COFEPRIS:** No expone API oficial. Diferida a iteración posterior (descarga periódica de CSV).

---

#### Frontend — Flujo de registro de ProductType

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 9 | Autocomplete en campo de producto (intake) | Campo tipo-ahead que consulta primero `/v1/catalog/search` (local, offline-OK); seleccionar un resultado prellenea INN, forma, concentración, categoría | 🟠 | ⬜ Pendiente |
| 10 | Barcode → prellenado automático | Al escanear o ingresar GTIN en formulario de nuevo ProductType: llama `/v1/catalog/barcode/{gtin}`; prellenado si hay match; si 503 → error claro "Sin conexión — no se puede validar el producto"; no permite continuar | 🟡 | ⬜ Pendiente |
| 11 | INN autocomplete con RxNorm | En campo `inn_name` del formulario de nuevo ProductType: sugerencias desde `/v1/catalog/rxnorm?q=`; si 503 → aviso "Sin conexión — escribe el INN manualmente con cuidado" (sí permite continuar, el guard de dedup atrapa duplicados) | 🟡 | ⬜ Pendiente |
| 12 | Indicador de conectividad | Banner o badge en el formulario de nuevo ProductType: "● Con conexión — lookups activos" / "● Sin conexión — solo puedes usar productos del catálogo existente"; usa `navigator.onLine` + ping al backend | 🟢 | ⬜ Pendiente |

---

#### Interoperabilidad y home page

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 13 | Export IFRC packing list | Manifiesto en Excel (`.xlsx`) con columnas exigidas por IFRC: código de material, descripción, unidad, cantidad, peso, valor estimado | 🟡 | ⬜ Pendiente |
| 14 | Sección "Estándares que respaldamos" | Bloque en home pública: logos/nombres de WHO, IFRC/ICRC, IOM, UNSPSC; explica cómo cada uno garantiza calidad de datos y trazabilidad | 🟢 | ⬜ Pendiente |

---

> **Decisiones de diseño:**
> - Los seeds viajan en migraciones Alembic — se aplican automáticamente en cada deploy Railway, igual que el esquema.
> - El autocomplete de intake busca primero en la DB local (task 9) — sin internet, los ~850 productos seeded están disponibles.
> - La creación de ProductType nuevo (tasks 10–11) puede requerir o no internet según el campo: GTIN siempre requiere lookup; INN permite fallback manual porque el guard de dedup (task 7) protege contra duplicados.
> - `unaccent` de PostgreSQL normaliza acentos en la deduplicación: "ibuprofén" = "ibuprofen" = "Ibuprofeno".
> - Los 503 de lookup son informativos y visibles — nunca silenciosos.
