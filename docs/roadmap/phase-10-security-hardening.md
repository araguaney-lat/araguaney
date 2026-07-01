# Fase 10 — Endurecimiento de seguridad (post-auditoría)

> Resultado de la auditoría de seguridad realizada el 2026-07-01.
> Contexto de amenaza: campaña de ayuda humanitaria políticamente polémica; se anticipan ataques
> dirigidos (DDoS, defacement, exfiltración, bypass de autenticación por actores estatales o
> políticamente motivados).

---

## Objetivos

1. Cerrar los 2 hallazgos críticos (bypass de middleware Cloudflare, bypass de TOTP vía OAuth)
2. Corregir los 7 hallazgos HIGH (open redirect, rate limit faltante, R2, filename, TOTP parcial, middleware /studio, headers de seguridad en frontend)
3. Mejorar los 9 hallazgos MEDIUM (studio role guard, audit count, audit atomicidad, is_active ordering, warning de ENCRYPTION_KEY, timing oracle en login, extra="forbid", RLS en DB, traza de IP en auditoría)
4. Aplicar mejoras LOW (headers backend, cap CSV, doc lockout por IP, fuerza de contraseña en registro)

> 22 tareas totales: 2 CRITICAL, 7 HIGH, 9 MEDIUM, 4 LOW. Hallazgos de la primera pasada (C/H/M/L)
> y de la segunda pasada (N-1 a N-6) consolidados en los grupos A-D.

---

## Hallazgos — resumen ejecutivo

| ID | Severidad | Área | Archivos afectados |
|----|-----------|------|--------------------|
| C-1 | 🔴 CRITICAL | CloudflareOnly no valida IP TCP | `backend/app/main.py:86-95` |
| C-2 | 🔴 CRITICAL | OAuth login bypasa TOTP/2FA | `backend/app/services/auth_service.py:187-212` |
| H-1 | 🟠 HIGH | R2: ownership de key no validado en confirm | `backend/app/services/thread_service.py:66-83` |
| H-2 | 🟠 HIGH | Filename sin sanitizar en R2 key / header injection | `backend/app/services/thread_service.py:60-62`, `schemas/messaging.py` |
| H-3 | 🟠 HIGH | `verify-email` sin rate limiting | `backend/app/routers/auth.py:75-77` |
| H-4 | 🟠 HIGH | Token TOTP parcial sin JTI (no revocable) | `backend/app/services/auth_service.py:142-146` |
| H-5 | 🟠 HIGH | Open redirect vía `callbackUrl` no validado | `frontend/src/lib/actions.ts:26` |
| H-6 | 🟠 HIGH | `/studio` ausente en middleware matcher de Next.js | `frontend/src/middleware.ts:33-35` |
| M-1 | 🟡 MEDIUM | Studio backend usa `require_national_admin` en vez de `get_current_superadmin` | `backend/app/routers/studio.py` |
| M-2 | 🟡 MEDIUM | Count de audit log carga todos los IDs en memoria | `backend/app/repositories/audit_repository.py:61-63` |
| M-3 | 🟡 MEDIUM | Audit logging no es atómico con la acción auditada | `backend/app/utils/audit.py` |
| M-4 | 🟡 MEDIUM | Check `is_active` se realiza después de verificar contraseña | `backend/app/services/auth_service.py:115-120` |
| M-5 | 🟡 MEDIUM | `ENCRYPTION_KEY` cae silenciosamente a `SECRET_KEY` sin advertencia | `backend/app/utils/crypto.py` |
| L-1 | 🟢 LOW | Headers `Strict-Transport-Security` y `Permissions-Policy` faltantes | `backend/app/main.py` |
| L-2 | 🟢 LOW | CSV export sin límite de rango de fechas | `backend/app/routers/report.py` |
| L-3 | 🟢 LOW | Sin bloqueo por IP (solo por cuenta); credential stuffing posible | `backend/app/services/auth_service.py` |
| L-4 | 🟢 LOW | PostCSS < 8.5.10 (GHSA-qx2v-qp2m-jg93, build-time) | `frontend/package.json` (transitive) |

### Segunda pasada (2026-07-01) — hallazgos adicionales

| ID | Severidad | Área | Archivos afectados |
|----|-----------|------|--------------------|
| N-1 | 🟠 HIGH | Frontend sin headers de seguridad (no CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy) — superficie de defacement/clickjacking | `frontend/next.config.ts` |
| N-2 | 🟡 MEDIUM | User enumeration por timing oracle en login (bcrypt solo corre para usuarios existentes) | `backend/app/services/auth_service.py:86-100` |
| N-3 | 🟡 MEDIUM | `StrictModel` usa `strict=True` pero no `extra="forbid"` — sin protección anti mass-assignment a nivel de schema | `backend/app/schemas/_base.py` |
| N-4 | 🟢 LOW | Registro sin validación de fuerza de contraseña (change/reset exigen 8-128, register no valida) | `backend/app/schemas/auth.py` (`UserCreate`) |
| N-5 | 🟡 MEDIUM | Sin Row-Level Security (RLS) a nivel DB — aislamiento multi-tenant depende 100% de `TenantRepository.scoped()`; un query que olvide `.scoped()` filtra entre centros sin red de seguridad en la DB | `backend/alembic/` + `backend/app/database.py` |
| N-6 | 🟡 MEDIUM | Traza de IP incompleta en auditoría — los eventos privilegiados (alta de usuario, cambio de rol, reset de contraseña, invitación, aprobación de solicitud) usan `AuditRepository(db).log(...)` sin `ip=`; solo los eventos de estado vía `fire_audit` la capturan | `backend/app/routers/{studio,users,auth,requests}.py` |

> **Verificado OK en 2ª pasada** (sin hallazgo): `UserCreate` no expone `role`/`center_role`/`center_id` (sin escalación de privilegios en registro); autz de transferencias correcta (coordinator scoped + guard de centro destino); dependencias del backend pinneadas; Turnstile verificado server-side y fail-closed; guards de máquina de estado presentes (`box.status != "DRAFT"` en sellado); sin logging de tokens/contraseñas; token de reset con `secrets.token_urlsafe(32)` + expiración 1h; usuarios OAuth (sin contraseña) no pueden resetear.

---

## Tareas

### Grupo A — Críticos (implementar primero)

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 1 | Fix C-1: CloudflareOnly valida IP TCP | Leer `request.client.host` (antes de que `ProxyHeadersMiddleware` lo reescriba) y compararlo contra `_CF_RANGES` con `is_cloudflare_ip()`. Solo si está en rangos CF y tiene `CF-Connecting-IP` header pasa. Ajustar orden de middlewares en `main.py` (CloudflareOnly antes, ProxyHeaders después). | 🔴 | ✅ Hecho |
| 2 | Fix C-2: OAuth login verifica TOTP | En `auth_service.oauth_login()`, antes de emitir el token completo, chequear `user.totp_enabled`. Si está activo, emitir token parcial y devolver `requires_totp: true`, igual que en `login()`. | 🔴 | ✅ Hecho |

### Grupo B — High (implementar en misma rama que A)

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 3 | Fix H-5: Open redirect callbackUrl | En `frontend/src/lib/actions.ts`, validar que `callbackUrl` empiece con `/` y no con `//`. Caer a `/dashboard` si no cumple. | 🟠 | ✅ Hecho |
| 4 | Fix H-3: Rate limit en verify-email | Agregar `@limiter.limit("10/hour")` y parámetro `request: Request` al endpoint `GET /v1/auth/verify-email`. | 🟠 | ✅ Hecho |
| 5 | Fix H-6: /studio en middleware matcher | Agregar `/studio/:path*` al matcher de `frontend/src/middleware.ts`. Agregar guards de `isLoggedIn` y `platformRole === "superadmin"` para rutas studio. | 🟠 | ✅ Hecho |
| 6 | Fix H-1: R2 ownership validation | En `thread_service.confirm_attachment()`, verificar que `req.r2_key` empiece con `attachments/{user.id}/`. Rechazar 403 si no. | 🟠 | ✅ Hecho |
| 7 | Fix H-2: Filename sanitization | Agregar `@field_validator("filename")` en `UploadUrlRequest` que remueva caracteres peligrosos (regex `[^\w.\-]` → `_`, máx 255 chars). Aplicar misma sanitización al `status` query param usado en headers `Content-Disposition` de PDFs. | 🟠 | ✅ Hecho |
| 8 | Fix H-4: JTI en token TOTP parcial | Agregar `jti = str(uuid.uuid4())` en `_create_partial_token()`. En `totp_challenge()`, tras autenticación exitosa, agregar el `jti` parcial al `TokenDenylist` para invalidarlo. | 🟠 | ✅ Hecho |
| 17 | Fix N-1: Headers de seguridad en frontend | Agregar `headers()` en `frontend/next.config.ts` con `Content-Security-Policy`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. Ajustar CSP para permitir Cloudinary, Turnstile y Sentry. | 🟠 | ✅ Hecho |

### Grupo C — Medium

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 9 | Fix M-1: Studio role guard | Reemplazar `require_national_admin` con `get_current_superadmin` en todos los endpoints de `backend/app/routers/studio.py`. Confirmar que el dashboard `/admin/users` del national_admin sigue usando el router `users.py` (ya correcto). | 🟡 | ✅ Hecho |
| 10 | Fix M-4: is_active antes de verificar contraseña | En `auth_service.login()`, mover el check `is_active` **antes** de `verify_password()`. Cuentas desactivadas deben retornar `INVALID_CREDENTIALS` sin resetear el contador de intentos. | 🟡 | ✅ Hecho |
| 11 | Fix M-2: Audit count con `SELECT COUNT(*)` | En `audit_repository.py`, reemplazar `.all().__len__()` por `select(func.count()).select_from(base.with_only_columns(AuditLog.id).subquery())`. | 🟡 | ✅ Hecho |
| 12 | Fix M-5: Warning de ENCRYPTION_KEY faltante | En `main.py` startup, loguear un `WARNING` si `settings.encryption_key` no está configurado, advirtiendo que rotar `SECRET_KEY` invalidará todos los secretos TOTP. | 🟡 | ✅ Hecho |
| 13 | Doc M-3: Audit atomicidad | Documentar en `utils/audit.py` cuáles eventos son best-effort (fire_audit con BackgroundTask) y cuáles deben ir en la misma transacción. Migrar los eventos de cambio de estado crítico (sellado de caja, cierre de envío, cambio de rol) a audit síncrono en la misma sesión. | 🟡 | ⬜ Pendiente |
| 18 | Fix N-2: Timing oracle en login | En `auth_service.login()`, cuando `user is None`, ejecutar un `verify_password` dummy contra un hash bcrypt fijo para igualar la latencia y evitar user enumeration. | 🟡 | ✅ Hecho |
| 19 | Fix N-3: `extra="forbid"` en StrictModel | Agregar `extra="forbid"` a `ConfigDict` en `StrictModel` (schemas/_base.py). Verificar que ningún endpoint rompa por campos extra legítimos; corregir schemas afectados. Protección anti mass-assignment a nivel de boundary. | 🟡 | ✅ Hecho |
| 21 | Fix N-5: Row-Level Security (RLS) en DB | Migración que active `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` en tablas con `center_id` (boxes, pallets, shipments, intakes, product_types...). Hook en `get_db` que ejecute `SET LOCAL app.current_center_id = ...` por transacción (compatible con PgBouncer transaction mode). Policy que lea `current_setting('app.current_center_id', true)`; bypass para `national_admin` (center_id NULL → policy USING clause que permita NULL, o rol con BYPASSRLS). No reemplaza `.scoped()`, lo respalda (defense-in-depth). Tests de aislamiento con `.scoped()` omitido a propósito. | 🟡 | ⬜ Pendiente |
| 22 | Fix N-6: Traza de IP completa en auditoría | Pasar `ip=get_client_ip(request)` en todas las llamadas `AuditRepository(db).log(...)` de `studio.py`, `users.py`, `auth.py`, `requests.py`. Agregar `request: Request` a los handlers que aún no lo tengan. Confirmar que las 15 llamadas `fire_audit` también pasan ip (1 pendiente). Opcional: agregar `user_agent` a `AuditLog` para forense más rico. | 🟡 | ✅ Hecho |

### Grupo D — Low

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 14 | Fix L-1: HSTS y Permissions-Policy | Agregar `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` y `Permissions-Policy: geolocation=(), microphone=(), camera=()` en `SecurityHeadersMiddleware` de `main.py`. | 🟢 | ✅ Hecho |
| 15 | Fix L-2: Cap de rango en CSV export | En `report.py._resolve_dates()`, limitar a máximo 366 días. Si `(end - start).days > 366`, truncar `start = end - timedelta(days=366)`. | 🟢 | ✅ Hecho |
| 16 | Doc L-3: Bloqueo por IP (roadmap futuro) | Documentar la estrategia de IP-level soft block: rastrear fallos cross-cuenta por IP en Redis, bloqueo suave tras 50 fallos en 1 hora. Implementar en Phase 11 o como feature flag. | 🟢 | ⬜ Pendiente |
| 20 | Fix N-4: Fuerza de contraseña en registro | Agregar `@field_validator("password")` en `UserCreate` que exija 8-128 caracteres (mismo criterio que change/reset). Considerar extraer la validación a un helper compartido. | 🟢 | ✅ Hecho |

---

## Checklist de verificación post-fix

- [ ] `CLOUDFLARE_ONLY=true` en Railway → petición directa sin IP CF retorna 403
- [ ] `CLOUDFLARE_ONLY=true` → petición con `CF-Connecting-IP` forjado pero IP TCP fuera de CF → retorna 403
- [ ] Usuario con TOTP activo + cuenta OAuth no puede obtener token completo sin TOTP challenge
- [ ] `callbackUrl=https://evil.example` → redirige a `/dashboard`, no a dominio externo
- [ ] `GET /v1/auth/verify-email` con 11+ requests en 1 hora → retorna 429
- [ ] `/studio` sin sesión → redirige a `/login`; con sesión no-superadmin → redirige a `/dashboard`
- [ ] `confirm_attachment` con `r2_key` de otro usuario → retorna 403
- [ ] Filename con `../../../etc/passwd` en upload → sanitizado a `______etc_passwd`
- [ ] `GET /v1/studio/users` con token de `national_admin` (role=user) → retorna 403
- [ ] Respuesta HTTP del frontend incluye `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`
- [ ] Login con usuario inexistente vs existente → latencia comparable (sin timing oracle)
- [ ] Request body con campo extra no declarado → retorna 422 (extra="forbid")
- [ ] Registro con contraseña de 3 caracteres → retorna 422
- [ ] Query sin `.scoped()` a propósito → RLS bloquea filas de otro centro (no filtra datos)
- [ ] `national_admin` con RLS activo → sigue viendo todos los centros y la agregación nacional funciona
- [ ] Alta de usuario / cambio de rol / reset de contraseña → registro de auditoría incluye `ip`

---

## Notas de arquitectura

### C-1 — Orden de middlewares en Starlette (LIFO)

Starlette aplica middlewares en orden inverso al de registro. Para que `CloudflareOnlyMiddleware` vea el IP TCP real (antes de que `ProxyHeadersMiddleware` lo reescriba desde `X-Forwarded-For`), debe registrarse **después** de `ProxyHeadersMiddleware`:

```python
# main.py — orden correcto (último registrado = primero en ejecutarse)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=...)   # corre segundo
app.add_middleware(CloudflareOnlyMiddleware)                    # corre primero
```

### M-1 — Decisión arquitectural: studio vs dashboard/admin

El `/studio` frontend sirve como panel de superadmin de plataforma. El `/dashboard/admin` sirve al national_admin de dominio. Son capas distintas y no deben compartir guards.

- `studio.py` router → `get_current_superadmin` (platform role)
- `users.py` router → `require_coordinator` / `require_national_admin` (domain role)

Esto es consistente con lo que ya hace `transfer.py` que usa `get_current_superadmin` para sus endpoints de studio.

### N-5 — RLS en DB con PgBouncer (transaction mode)

El aislamiento multi-tenant hoy es 100% a nivel de aplicación (`TenantRepository.scoped()`). RLS agrega una segunda capa en la DB: aunque un query olvide `.scoped()`, Postgres rechaza las filas de otro centro.

**Compatibilidad con PgBouncer:** en transaction pooling las variables de sesión (`SET`) no sobreviven entre transacciones. Hay que usar `SET LOCAL` dentro de cada transacción, típicamente en un hook al abrir la sesión en `get_db`:

```python
# database.py — al iniciar cada request/transacción
db.execute(text("SET LOCAL app.current_center_id = :cid"),
           {"cid": str(center_id) if center_id else ""})
```

```sql
-- migración
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON boxes
  USING (
    current_setting('app.current_center_id', true) = ''      -- national_admin (NULL) ve todo
    OR center_id::text = current_setting('app.current_center_id', true)
  );
```

- `national_admin` (center_id NULL) → se setea `''` → el `USING` con `= ''` deja pasar todo, y la agregación nacional (`GROUP BY`) sigue funcionando.
- Aplicar a todas las tablas con `center_id`: boxes, pallets, shipments, intakes, product_types (scoped), etc.
- El rol de la app NO debe tener `BYPASSRLS`; el owner de las tablas sí puede bypasear en migraciones/seeds.
- **No reemplaza `.scoped()`** — es defense-in-depth. El scoping de app sigue siendo la primera línea.

### N-6 — Traza de IP como auditoría interna

La infraestructura ya existe (`AuditLog.ip`, `fire_audit(ip=...)`, `AuditRepository.log(ip=...)`). El hueco: los `AuditRepository(db).log(...)` directos en `studio.py`, `users.py`, `auth.py` y `requests.py` no pasan `ip`. Esos son precisamente los eventos privilegiados (alta/edición de usuarios, roles, reset de contraseñas, invitaciones, aprobación de solicitudes) donde la IP es más valiosa para forense.

Fix: usar siempre `ip=get_client_ip(request)` (de `utils/cloudflare.py`, que ya lee `CF-Connecting-IP`). Requiere que el handler reciba `request: Request`. Considerar agregar columna `user_agent` a `AuditLog` para trazas más ricas.
