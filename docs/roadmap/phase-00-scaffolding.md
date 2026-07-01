### Fase 0 — Scaffolding, multi-tenant y roles ✅

> Base ejecutable con aislamiento por centro y roles de dominio.
> Criterios de aceptación: un `coordinator` solo ve datos de su `center_id`; el `national_admin` ve todos; ningún endpoint consulta sin `scoped()`. Test de fuga entre centros.

#### Infra y base de datos

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Envs Railway + Vercel | Configurar variables de entorno: Railway (backend, Postgres, Redis) y Vercel (front) | 🟢 | ✅ Done |
| 2 | Migración `002_acopio_core_schema` | Aplicar `alembic upgrade head` con el esquema base de dominio | 🟢 | ✅ Done |

#### Backend

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 3 | Modelos SQLAlchemy | `Center`, `ProductType`, `Intake`, `Box`, `Pallet`, `Shipment`, `*Event` | 🟠 | ✅ Done |
| 4 | Extender `User` | Agregar `center_id` + `center_role` al modelo y al schema | 🟡 | ✅ Done |
| 5 | `tenant_scope` dependency | Dependency que devuelve `center_id` del usuario o `None` si es `national_admin` | 🟡 | ✅ Done |
| 6 | `TenantRepository.scoped()` | Extender `BaseRepository` con filtrado por `center_id` | 🟡 | ✅ Done |
| 7 | CRUD de `Center` | Endpoints solo para `national_admin`; alta y gestión de centros | 🟡 | ✅ Done |
| 8 | Alta de usuarios por `coordinator` | Endpoint para que coordinadores inviten voluntarios a su centro | 🟡 | ✅ Done |

#### Frontend

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 9 | Layout + login NextAuth | Layout base, pantalla de login, sesión con `center_role` | 🟡 | ✅ Done |
| 10 | Guard de rutas por rol | Middleware que protege rutas según `center_role` | 🟡 | ✅ Done |
| 11 | Selector de centro (admin nacional) | UI para que `national_admin` cambie el contexto de centro | 🟢 | ✅ Done |

#### País y estado en centros

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 12 | Migración `003_center_geo` | Agregar `country_code` (ISO 3166-1 α-2, ej. `MX`) y `state_name` a `centers` | 🟢 | ✅ Done |
| 13 | Actualizar modelo + CRUD de `Center` | Exponer `country_code` y `state_name` en schemas y endpoints | 🟢 | ✅ Done |
| 14 | UI de alta/edición de centro | Selector de país (dropdown ISO) + campo de estado/provincia en el formulario del `national_admin` | 🟡 | ✅ Done |

> **Nota de diseño:** `country_code` usa [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) (2 letras). `state_name` es texto libre para cubrir MX, VE y cualquier país futuro sin necesitar catálogo de estados. Se puede agregar `state_code` (ISO 3166-2) en una iteración posterior si se requiere filtrado programático por estado.

#### Campañas / Operaciones humanitarias

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 15 | Modelo + migración `004_campaigns` | Entidad `Campaign` global (sin `center_id`); FK nullable en `intakes` y `shipments` | 🟡 | ✅ Done |
| 16 | CRUD de campañas | Endpoints: `national_admin` crea/edita; coordinadores/voluntarios leen para seleccionar en intake/envío | 🟡 | ✅ Done |
| 17 | UI de gestión de campañas | Página `/dashboard/campaigns`; crear campaña con nombre, país destino, fechas; toggle activo/inactivo | 🟡 | ✅ Done |
| 18 | Selector de campaña en intake y envío | Dropdown de campaña activa al registrar donaciones y al crear envíos | 🟠 | ✅ Done |

> **Decisión de diseño:** Las campañas son **globales** (creadas por `national_admin`, sin `center_id`). Múltiples centros contribuyen a la misma campaña. `campaign_id` es FK nullable en `Intake` y `Shipment` para retrocompatibilidad.
