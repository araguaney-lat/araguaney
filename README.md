# Araguaney

> **El estándar común para coordinar centros de acopio y logística de ayuda humanitaria.**
> App web multi-centro y gratuita: registra donaciones **en especie** por ítem, las empaca en
> **cajas homogéneas** con QR, las consolida en **tarimas** y **envíos** con manifiesto
> exportable, y agrega el stock de todos los centros en un **panel nacional** en tiempo real.
> Sin datos personales de donantes ni beneficiarios — solo inventario, trazable de la caja al envío.

**El flujo:** `Intake` (recepción) → `Box` (caja homogénea + QR) → `Pallet` (tarima) → `Shipment`
(envío + manifiesto) → panel nacional agregado.

**Público + multi-idioma:** además del panel operativo, sirve un **sitio público bilingüe (ES/EN)**
optimizado para SEO/AEO — pilares, guías, glosario, "qué falta" (`/necesidades`), landings por
escenario, FAQ y changelog. Agnóstico de país; funciona para cualquier emergencia (sismos,
inundaciones, incendios, crisis migratorias).

> Deriva del boilerplate `fastapi-nextjs-boilerplate`. El **qué/por qué** del producto y sus reglas
> viven en [`CLAUDE.md`](CLAUDE.md); el **roadmap por fases** en [`docs/roadmap/`](docs/roadmap/);
> el mantenimiento de SEO/AEO en [`docs/seo-maintenance.md`](docs/seo-maintenance.md).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + SQLAlchemy + Alembic |
| Frontend | Next.js 15 + Tailwind CSS |
| Auth | NextAuth v5 (JWT) + bcrypt |
| Database | PostgreSQL |
| Background jobs | ARQ (Redis) — durable queue with in-process fallback |
| Cache | Redis (graceful degradation when absent) |
| Email | Resend + Jinja2 templates |
| Storage | Cloudinary (images) |
| Error tracking | Sentry (backend + frontend) |
| Alerts | Slack Bot (`chat.postMessage`) + infra-status enrichment |
| CI | Dependabot + npm/pip CVE audits (GitHub Actions) |
| Hosting | Railway (backend + DB + Redis) · Vercel (frontend) |
| Edge / SEO | Cloudflare (DNS/WAF) · IndexNow (Bing) · Google/Bing sitemaps |

## Domain model

Multi-tenant "pool / row-level": **un solo deploy, una sola DB, `center_id` discrimina por centro**
(hace trivial la agregación nacional). Todo acceso a datos pasa por el scoping de tenant.

| Entidad | Esencia |
|---|---|
| `Center` | El tenant (centro de acopio) |
| `ProductType` | El SKU — categoría + atributos (p. ej. `strength`) |
| `Intake` | Recepción de una donación (`donante_libre` opcional, sin PII) |
| `Box` | Caja **homogénea**: 1 `product_type` + 1 lote + 1 caducidad · QR propio |
| `Pallet` | Tarima (mixta) que agrupa cajas selladas · QR propio |
| `Shipment` | Envío que agrupa tarimas · genera el manifiesto/packing list |
| `Campaign` | Campaña/evento (slug público en `/eventos/{slug}`) |
| `Transfer` | Transferencia de inventario entre centros |

Máquinas de estado con auditoría (`*_event`): `Box` DRAFT→SEALED→SHIPPED (+REJECTED),
`Pallet` OPEN→CLOSED→SHIPPED, `Shipment` OPEN→CLOSED→SHIPPED.

## Roles

- **`users.role`** (del boilerplate) gobierna las secciones: `user` → `/dashboard`,
  `superadmin` → `/studio`, y las rutas públicas sin login.
- **`center_role`** controla qué ve cada usuario dentro de `/dashboard`:
  - `volunteer` — intake, cajas, etiquetas (su centro)
  - `coordinator` — + tarimas, envíos, manifiestos, gestión de su centro
  - `national_admin` — agregado nacional, centros/campañas, usuarios, auditoría (`center_id = NULL`)

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── routers/          # Thin HTTP handlers — validate input, call service, return response
│   │   ├── services/         # Business logic — framework-agnostic, injected with db session
│   │   ├── repositories/     # Data access only — no business logic, named query methods
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic I/O schemas (strict mode via StrictModel base)
│   │   ├── utils/            # Shared utilities — see "Backend utilities" below
│   │   ├── templates/
│   │   │   └── emails/       # Jinja2 HTML email templates
│   │   ├── config.py         # Pydantic settings — reads from .env
│   │   ├── database.py       # SQLAlchemy engine + session + Base (TCP keepalives)
│   │   ├── dependencies.py   # Auth dependencies (get_current_user, etc.)
│   │   ├── email.py          # Resend send functions
│   │   ├── arq_pool.py       # Durable background-job queue (Redis) + in-process fallback
│   │   ├── worker.py         # ARQ worker: task definitions, crons, fallbacks
│   │   └── main.py           # App factory, lifespan, middleware, versioned routers
│   ├── alembic/              # Database migrations
│   │   └── versions/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/                  # Next.js App Router — [lang]/ (público ES/EN i18n),
│   │                         #   dashboard/, studio/, sitemap.ts, robots.ts, manifest.ts
│   ├── public/               # Estáticos + llms.txt / llms-full.txt + key IndexNow
│   └── src/
│       ├── components/       # Shared UI components
│       ├── lib/              # actions.ts, api.ts, routes.ts (i18n), seo.ts,
│       │                     #   structured-data.ts, scenarios.ts, changelog.ts, …
│       ├── content/          # Copy legal (privacy/terms) por idioma
│       ├── dictionaries/     # i18n (es.json / en.json)
│       └── types/            # Shared TypeScript interfaces
├── .github/
│   ├── dependabot.yml        # Grouped weekly dep updates (npm + pip + actions)
│   └── workflows/
│       └── security-scan.yml # npm/pip audit — bloquea solo si el PR cambia deps
├── docs/
│   ├── roadmap/              # Roadmap por fases (fuente de verdad del avance)
│   ├── integrations/         # Guías portables (p. ej. Resend deliverability)
│   ├── seo-maintenance.md    # Runbook de mantenimiento SEO/AEO
│   └── optional-layers.md    # Capas opcionales del boilerplate
├── docker-compose.yml        # Local dev: db + redis + backend + worker + frontend
└── .env.example              # All env vars documented
```

## Getting Started

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- Python 3.12+

### Local development with Docker (recommended)

```bash
# 1. Copy and fill env vars
cp .env.example backend/.env
cp .env.example frontend/.env.local
# Edit both files

# 2. Start all services
docker compose up --build

# 3. Run migrations (first time only)
docker compose exec backend alembic upgrade head
```

### Without Docker

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
cp ../.env.example .env.local
npm run dev
```

## Environment Variables

See `.env.example` for all variables with descriptions.

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_URL_DIRECT` | Direct (non-PgBouncer) URL for Alembic migrations (optional) |
| `SECRET_KEY` | JWT signing secret (`openssl rand -hex 32`, min 32 bytes enforced) |
| `ENCRYPTION_KEY` | Fernet key for `app.utils.crypto` (optional, falls back to `SECRET_KEY`) |
| `REDIS_URL` | Redis for ARQ jobs + cache (optional, degrades gracefully) |
| `FRONTEND_URL` | Frontend URL(s) for CORS — comma-separated |
| `INTERNAL_API_SECRET` | Shared secret for server-to-server endpoints |
| `ADMIN_ALLOWED_IPS` | Comma-separated IPs for admin routes (empty = open) |
| `CLOUDFLARE_ONLY` | `true` to block requests not proxied through Cloudflare |
| `CLOUDFLARE_SHARED_SECRET` | Header secret paired with a Cloudflare Transform Rule (required if `CLOUDFLARE_ONLY`) |
| `GOOGLE_SAFE_BROWSING_API_KEY` | URL reputation checks in `url_security` (optional) |
| `RESEND_API_KEY` | Resend API key for transactional email (optional) |
| `RESEND_WEBHOOK_SECRET` | Svix signing secret for the Resend webhook (email deliverability view) |
| `MAIL_FROM` / `MAIL_FROM_NAME` | Sender address + name for transactional email |
| `INDEXNOW_KEY` | IndexNow token (Bing instant indexing). Must equal `frontend/public/<key>.txt` |
| `SENTRY_DSN` | Sentry DSN — backend error tracking (optional) |
| `SLACK_BOT_TOKEN` | Slack Bot OAuth token `xoxb-...` (optional) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_SECRET` | NextAuth signing secret |
| `API_URL` | FastAPI base URL — server-side calls |
| `NEXT_PUBLIC_API_URL` | FastAPI base URL — client-side calls |
| `NEXT_PUBLIC_SITE_URL` | Canonical public host (`https://www.araguaney.lat`) — drives canonicals, sitemap, robots, hreflang |
| `INTERNAL_API_SECRET` | Same value as backend |

## Database Migrations

```bash
# Generate a new migration from model changes
alembic revision --autogenerate -m "add users table"

# Apply all pending migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Backend | Railway | Set env vars, run `alembic upgrade head` on release |
| Frontend | Vercel | Connect repo, set env vars in dashboard |
| Database | Railway PostgreSQL addon | Auto-injects `DATABASE_URL` |

## What's included

**Dominio (Araguaney)**
- Intake de donaciones por ítem con validación en recepción (caducidad, reglas OMS de
  medicamentos, bloqueo de controlados) — rechazo en el momento del registro
- Caja **homogénea** garantizada por esquema (1 producto + 1 lote + 1 caducidad) con QR + etiqueta
- Tarimas y envíos con **manifiesto / packing list exportable** (PDF/XLSX, encolado en ARQ)
- **Panel nacional agregado** — stock de todos los centros en tiempo real (un `GROUP BY`)
- **Transferencias** entre centros · **mensajería** entre usuarios · **reportes** de campaña
- **Auto-registro de centros** con aprobación (invitación por email, cambio de contraseña forzado)
- **Deliverability de emails** — webhook de Resend (bounces/quejas) + panel de reenvío
- Catálogos de referencia (WHO/OMS, IFRC/ICRC, IOM, UNSPSC, GS1) para clasificar el inventario

**Public site & SEO/AEO**
- Sitio público **bilingüe (ES/EN)** con locale por URL (ES sin prefijo, EN con `/en/...`,
  slugs traducidos vía `src/lib/routes.ts`) + `hreflang`/canonical
- Pilares, guías, glosario, `/necesidades` ("qué falta"), landings por **escenario**
  (`/escenarios/[scenario]`) y por **categoría**, hub `/preguntas-frecuentes`, changelog
  `/novedades`, `/nosotros`, landing de México (COFEPRIS/SAT)
- `sitemap.ts` + `robots.ts` (declara crawlers de IA) + `llms.txt` / `llms-full.txt`
- Structured data (schema.org): `Organization` (con `sameAs`/founder), `SoftwareApplication`,
  `Article`/`HowTo`/`FAQPage`/`BreadcrumbList`/`Event`, `speakable` — en `src/lib/structured-data.ts`
- **IndexNow** on-publish: al crear una campaña pública, el backend pinguea Bing (grounding de
  ChatGPT/Copilot) — ver `app/utils/indexnow.py`
- Señales de frescura (`dateModified` + fecha visible en guías) y bylines E-E-A-T
- Host canónico único (`www`), Google Search Console + Bing Webmaster verificados
- Mantenimiento recurrente: [`docs/seo-maintenance.md`](docs/seo-maintenance.md)

**Auth**
- JWT auth with token denylist (logout revocation)
- Email + password register with email verification flow
- Password reset flow
- Login lockout after 10 failed attempts (15 min, auto-resets on success)
- OAuth login (Google — wire up in `auth.ts`)
- Role-based access control (`user` / `admin` / `superadmin`)

**Architecture**
- Service / Repository / Schema layer separation (no `db.query()` in routers)
- Pydantic v2 strict mode on all schemas (`StrictModel` / `StrictORMModel`)
- Structured error envelope: `{ error: { code, message, field, meta } }` on every error
- `api_error()` helper for consistent error raising from services

**Security**
- Rate limiting on all sensitive endpoints (slowapi + Cloudflare IP detection)
- Security headers middleware (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- `AdminIPAllowlistMiddleware` — restrict admin routes by IP
- `CloudflareOnlyMiddleware` — block direct origin hits in production
- `SECRET_KEY` minimum 32 bytes enforced at startup
- **SSRF protection** for user URLs (`utils/url_security.py`) + optional Google Safe Browsing
- **Input sanitization** helpers for schema validators (`utils/sanitize.py`)
- **Fernet encryption** for sensitive DB-stored values (`utils/crypto.py`)
- **Dependency CVE scanning** in CI (`npm audit` + `pip-audit`) + grouped Dependabot updates

**Background jobs & cache**
- ARQ durable task queue (`arq_pool.py` + `worker.py`) — jobs persist in Redis and
  survive restarts, retry on failure, and run in a separate `worker` container
- **Graceful degradation**: with no `REDIS_URL`, queued tasks fall back to in-process
  FastAPI `BackgroundTasks` and the cache becomes a no-op — zero Redis dependency in dev
- Generic Redis cache helper (`utils/cache.py`) with the same degrade-to-source pattern

**Infrastructure**
- All routes versioned under `/v1` — see [API Versioning](#api-versioning) below
- Sentry error tracking wired on backend and frontend
- Slack Bot alert on unhandled 500 errors, **auto-enriched with Railway/Vercel status**
  (`utils/infra_status.py`) so you instantly know if it's an upstream outage
- GZip compression
- CORS configured for multi-origin (comma-separated `FRONTEND_URL`)
- PgBouncer-compatible connection pooling + TCP keepalives (no dropped idle connections)
- Alembic migrations with autogenerate (uses `DATABASE_URL_DIRECT` to bypass PgBouncer)
- Docker Compose for full local stack (db + redis + backend + worker + frontend)

### Backend utilities (`app/utils/`)

| File | Purpose |
|------|---------|
| `errors.py` | `api_error()` — structured error envelope helper |
| `rate_limit.py` | slowapi limiter instance |
| `cloudflare.py` | `get_client_ip()` — real client IP behind Cloudflare/proxy |
| `slack.py` | `notify_slack()` — fire-and-forget bot alerts |
| `sanitize.py` | `strip_html`, `validate_username/slug/url_scheme` for schema validators |
| `url_security.py` | `validate_url()` (SSRF) + `check_safe_browsing()` for user URLs |
| `crypto.py` | `encrypt_value` / `decrypt_value` (Fernet) for sensitive columns |
| `cache.py` | `get/set/delete/incr` Redis cache, no-op when Redis is absent |
| `infra_status.py` | Railway/Vercel status for Slack alert enrichment |

### Background jobs

Enqueue a durable task from any service — it runs in the `worker` process when
Redis is available, or in-process otherwise:

```python
from app.arq_pool import enqueue

# In a router/service that already has BackgroundTasks injected:
enqueue(background_tasks, "send_verification_email_task", user.email, token)
```

Define the task and its in-process fallback in `app/worker.py`, then run the worker:

```bash
docker compose up worker          # already wired in docker-compose.yml
# or standalone:
cd backend && arq app.worker.WorkerSettings
```

> **Origin:** the background-jobs queue, cache, security utilities, infra-status
> enrichment, TCP keepalives, and CI workflows were ported from the production
> **bioflow** app and generalized for reuse here.

## API Versioning

### Current state

All routes are registered under `/v1` via a `_V1` constant in `main.py`:

```python
_V1 = "/v1"
app.include_router(auth.router, prefix=_V1)
```

This is intentionally the simplest possible starting point — explicit, zero magic, works today.

### Planned: `VersionedRouter` system

The next iteration replaces the raw prefix with a proper versioning infrastructure. Design goals:

- **Multiple version transports** — resolve version from URL path (`/v2/...`), header (`X-API-Version: 2`), or query param (`?v=2`), in that priority order.
- **Version inheritance / fallback** — a v2 router that doesn't define a specific route automatically falls back to the v1 handler. Clients on old versions keep working without changes.
- **Per-handler version ranges** — handlers declare the version range they serve:
  ```python
  @router.get("/users/me", versions=range(1, None))   # all versions
  @router.get("/users/me", versions=range(2, None))   # v2+ only (v1 uses previous handler)
  ```
- **Deprecation response headers** — `X-API-Version`, `Deprecation`, and `Sunset` headers injected automatically for old versions.
- **`VersionRegistry`** — central registry of known versions, their status (`active` / `deprecated` / `sunset`), and sunset dates.
- **No external dependencies** — implemented as ~150 lines of custom FastAPI infrastructure, no cadwyn or fastapi-versioning.

> **Why not cadwyn?** Evaluated and ruled out: background tasks broken in versioned endpoints, OAuth2 broken in Swagger UI, single maintainer, frequent breaking changes from FastAPI/Pydantic updates, and lifespan invoked twice on startup. Overkill for a boilerplate; the custom approach gives 80% of the value with full control.

### Version transport priority

```
1. URL path:   /v2/users/me           → version 2
2. Header:     X-API-Version: 2       → version 2
3. Query:      /users/me?v=2          → version 2
4. Default:    latest stable version
```

### Adding a v2 endpoint (future)

```python
# routers/users.py
@router.get("/users/me", versions=range(1, 2))   # v1 handler
def get_me_v1(current_user = Depends(get_current_user)):
    return UserResponseV1.from_orm(current_user)

@router.get("/users/me", versions=range(2, None))  # v2+ handler (new shape)
def get_me_v2(current_user = Depends(get_current_user)):
    return UserResponseV2.from_orm(current_user)
```

Unversioned routes (Stripe webhooks, health check) bypass the registry entirely.

## Licencia y marca

El código de Araguaney es **software libre bajo [AGPL-3.0](LICENSE)**: puedes
usarlo, estudiarlo, modificarlo y desplegar tu propia instancia. Si operas una
versión modificada como servicio, la AGPL te obliga a publicar tus cambios.

El uso de la plataforma en [araguaney.lat](https://www.araguaney.lat) es
**gratuito** para centros de acopio y coordinaciones humanitarias: sin
licencias, sin límite de cajas y sin costo por uso.

**La marca no se licencia con el código.** El nombre "Araguaney", el logo y el
dominio araguaney.lat identifican la instancia oficial y su red de centros.
Un fork debe operar bajo otro nombre y dominio, sin presentarse como la
instancia oficial — especialmente durante una emergencia, cuando la confusión
cuesta más.

Para reportar vulnerabilidades: [SECURITY.md](SECURITY.md). Para contribuir:
[CONTRIBUTING.md](CONTRIBUTING.md).
