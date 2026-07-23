# Spec — Fase 6: seeds de catálogo global (WHO / IOM-IFRC / alimentos)

**Fecha:** 2026-07-21 · **Estado:** aprobado

## Contexto

Fase 6 tareas 7–9 (roadmap) piden precargar `ProductType` globales (`campaign_id=NULL`)
para autocompletado y estándar común: medicamentos WHO, no-food IOM/IFRC y alimentos básicos.

**Correcciones al roadmap (números desfasados):**
- Los revs `014/015/016` que el roadmap propone **ya existen** (transfers/messaging/RLS).
  Las nuevas migraciones son **`025`, `026`, `027`** (head actual: `024`).
- **No hay** índice único para el `ON CONFLICT (inn_name, form, strength)` que asumía el
  roadmap. Se usa **id determinista** en su lugar.

**Volumen (decisión del usuario): subset curado real**, ampliable:
~150 medicamentos WHO EML, ~80 no-food IOM/IFRC, ~40 alimentos básicos (~270 filas).

## Arquitectura

### Datos como módulos Python versionados
`backend/app/seeds/` (solo stdlib `uuid` — sin imports pesados de la app, seguro en migración):
- `_base.py` — `SEED_NAMESPACE` (UUID fijo), `seed_id(natural_key)` = `uuid5(NS, key)`,
  `natural_key(row)` y `build_rows(rows)` (normaliza + calcula `id`, valida campos requeridos).
- `who_medicines.py` — `MEDICINES: list[dict]` (~150).
- `iom_nonfood.py` — `NONFOOD: list[dict]` (~80).
- `common_food.py` — `FOOD: list[dict]` (~40).

Cada fila: `category` (req), `display_name` (req) + opcionales `inn_name, brand, strength,
form, unspsc_code, gtin, default_unit, is_controlled, min_shelf_life_days, unit_weight_kg`.
Defaults por categoría: MEDICINE `min_shelf_life_days=365`; FOOD `=180`; no-food `NULL`.

**Clave natural** (para el id determinista):
- MEDICINE → `MEDICINE|{inn_name}|{strength}|{form}` (lower/trim).
- resto → `{category}|{display_name}` (lower/trim).
`id = uuid5(SEED_NAMESPACE, natural_key)` → estable entre corridas.

### Migraciones 025/026/027 (una por categoría)
Cada una importa su lista + `build_rows`, y hace **bulk insert idempotente**:
`INSERT INTO product_types (id, category, display_name, ...) VALUES (...) ON CONFLICT (id) DO NOTHING`.
`campaign_id=NULL` en todas. Encadenadas `025→024`, `026→025`, `027→026`.
`downgrade`: `DELETE FROM product_types WHERE id IN (<ids del seed>) AND campaign_id IS NULL`
(borra solo lo sembrado, por id — no toca catálogo de usuarios).

## Reglas de negocio respetadas
- `is_controlled=true` en narcóticos/psicotrópicos WHO (morfina, diazepam, fenobarbital,
  ketamina, metadona, midazolam, …) → intake los bloquea (CLAUDE.md §7).
- Medicamentos con los 5 campos para sellar (`inn_name, form, strength` + `min_shelf_life_days=365`).
- CHECK `category ∈ PRODUCT_CATEGORIES`. Sin PII. Migración reversible.

## Testing
1. **pytest sin DB** (`tests/test_seeds.py`, estilo mock del repo):
   - Conteos por lista en rango esperado.
   - Todos los `id` únicos; `uuid5` determinista (mismo input → mismo id).
   - Invariantes: MEDICINE trae `inn_name/form/strength` y `min_shelf_life_days=365`;
     FOOD `=180` y `category=FOOD`; `category` siempre en `PRODUCT_CATEGORIES`;
     `display_name` no vacío.
2. **Verificación contra Postgres temporal** (script throwaway): crear tabla `product_types`
   real, ejecutar el insert de las 3 migraciones **dos veces** → conteo estable (idempotencia),
   CHECK/NOT NULL satisfechos. (No se puede correr alembic: no está instalado y el entorno es
   PEP 668; se valida el SQL/ datos que la migración ejecuta.)

## Roadmap (al final, en el mismo PR)
- Marcar Fase 6 #7/#8/#9 ✅ con los revs reales `025/026/027` y el volumen curado.
- **Reconciliar totales desfasados** de todo el índice (el pie/tabla no cuadran: p.ej. Fase 6
  figuraba 0 pendientes con 3 ⬜; recomputar Listas/Pendientes/% por fase y el total).
- Revisar fases tocadas por PRs recientes (i18n subs 1–4 → Fase 11) por si quedaron tareas o
  totales sin actualizar.

## Fuera de alcance
Ampliar a los conteos completos (500/300/50); UI de gestión del catálogo global (ya existe
promover ProductType a global para national_admin).
